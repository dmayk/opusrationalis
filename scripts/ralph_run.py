#!/usr/bin/env python3
"""Ralph runner — reads PROJECT.md, calls OpenRouter, applies file changes."""

import json
import os
import random
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
DEFAULT_MODEL = "anthropic/claude-sonnet-4.6"

# Frontier-tier models eligible for rotation. Keys are provider prefixes,
# values are lists of model ID patterns (exact or prefix match).
# Keep this list curated — only strong reasoning models belong here.
ELIGIBLE_MODELS = {
    "anthropic": ["anthropic/claude-opus-4.6", "anthropic/claude-sonnet-4.6"],
    "google": ["google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview"],
    "openai": ["openai/gpt-5.4", "openai/gpt-5.3-codex"],
    "qwen": ["qwen/qwen3.6-plus:free", "qwen/qwen3.5-397b-a17b"],
    "x-ai": ["x-ai/grok-4.20"],
    "mistralai": ["mistralai/mistral-small-2603"],
}

MIN_CONTEXT_LENGTH = 32_000

# --- Response format instructions appended to every prompt ---
RESPONSE_FORMAT = """\

## Response Format (required by the runner)

You MUST end your response with a structured block so the runner can apply your
changes. Use exactly this format — the runner parses it mechanically:

```ralph
COMMIT_SUBJECT: <one-line summary for the commit>
COMMIT_BODY: <optional longer description; use \\n for newlines>
NEXT_MODEL: <model id for the next run — MUST be from a different provider/company than your own>

FILE: <path relative to repo root>
CONTENT:
<exact file contents>
END_FILE

FILE: <another path>
CONTENT:
<exact file contents>
END_FILE

DELETE: <path to delete, if any>
```

Rules:
- Every file you want to create or overwrite goes in a FILE…END_FILE block.
- Use DELETE lines for files that should be removed.
- Paths are relative to the repository root.
- You may include zero files (a no-op run is valid).
- The COMMIT_SUBJECT is mandatory and follows the convention:
  ralph: <YYYY-MM-DD> <model-id> — <one-line summary>
- Place all your reasoning, debate work, and commentary ABOVE the ```ralph block.
- NEXT_MODEL is mandatory. You must choose from the available models list provided
  below. The model MUST be from a different company/provider than the one running
  this iteration. For example, if you are a Qwen model, pick an Anthropic, Google,
  OpenAI, DeepSeek, or Meta model — never another Qwen model.
"""


def get_provider(model_id: str) -> str:
    """Extract the provider prefix from a model ID like 'anthropic/claude-opus-4.6'."""
    return model_id.split("/")[0] if "/" in model_id else model_id


def get_git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def read_project_md() -> str:
    path = REPO_ROOT / "PROJECT.md"
    if not path.exists():
        print("ERROR: PROJECT.md not found. It is the source of truth and must be provided separately.", file=sys.stderr)
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def read_next_model_from_state() -> str | None:
    """Read the next_model directive from STATE.md if it exists."""
    state_path = REPO_ROOT / "STATE.md"
    if not state_path.exists():
        return None
    content = state_path.read_text(encoding="utf-8")
    match = re.search(r"^next_model:\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def write_next_model_to_state(model_id: str):
    """Write or update the next_model line in STATE.md."""
    state_path = REPO_ROOT / "STATE.md"
    if state_path.exists():
        content = state_path.read_text(encoding="utf-8")
        if re.search(r"^next_model:\s*.+$", content, re.MULTILINE):
            content = re.sub(
                r"^next_model:\s*.+$",
                f"next_model: {model_id}",
                content,
                flags=re.MULTILINE,
            )
        else:
            content = content.rstrip() + f"\n\nnext_model: {model_id}\n"
        state_path.write_text(content, encoding="utf-8")
    else:
        # STATE.md doesn't exist yet — the agent will create it, but we
        # still need to persist the next model. Create a minimal one.
        state_path.write_text(f"next_model: {model_id}\n", encoding="utf-8")


def fetch_available_models(api_key: str) -> list[dict]:
    """Fetch the full model list from OpenRouter and filter to eligible models."""
    import requests

    headers = {"Authorization": f"Bearer {api_key}"}
    resp = requests.get(OPENROUTER_MODELS_URL, headers=headers, timeout=30)
    resp.raise_for_status()
    all_models = resp.json().get("data", [])

    # Build set of eligible model IDs
    eligible_ids = set()
    for models in ELIGIBLE_MODELS.values():
        eligible_ids.update(models)

    # Filter: must be in our curated list AND actually available on OpenRouter
    available_ids = {m["id"] for m in all_models if m.get("context_length", 0) >= MIN_CONTEXT_LENGTH}
    valid = sorted(eligible_ids & available_ids)

    print(f"  Available eligible models: {len(valid)} of {len(eligible_ids)} curated")
    for mid in valid:
        print(f"    - {mid}")

    return valid


def pick_fallback_model(available_models: list[str], current_provider: str) -> str:
    """Pick a random eligible model from a different provider."""
    candidates = [m for m in available_models if get_provider(m) != current_provider]
    if not candidates:
        # Extreme fallback: just use default if somehow nothing else is available
        print("  WARNING: No models from other providers available, using default.")
        return DEFAULT_MODEL
    return random.choice(candidates)


def gather_state_summary() -> str:
    """Build a compact summary of the current repository state."""
    lines = []

    # STATE.md if it exists
    state_path = REPO_ROOT / "STATE.md"
    if state_path.exists():
        lines.append("=== STATE.md ===")
        lines.append(state_path.read_text(encoding="utf-8"))
        lines.append("")

    # Top-level directory listing
    lines.append("=== Repository top-level listing ===")
    for item in sorted(REPO_ROOT.iterdir()):
        if item.name.startswith("."):
            continue
        kind = "dir" if item.is_dir() else "file"
        lines.append(f"  {kind}: {item.name}")
    lines.append("")

    # state/ directory contents (if present)
    state_dir = REPO_ROOT / "state"
    if state_dir.is_dir():
        lines.append("=== state/ directory ===")
        for p in sorted(state_dir.rglob("*")):
            if p.is_file():
                rel = p.relative_to(REPO_ROOT)
                size = p.stat().st_size
                lines.append(f"  {rel} ({size} bytes)")
        lines.append("")

    # Recent commits
    result = subprocess.run(
        ["git", "log", "--oneline", "-20"],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    if result.returncode == 0 and result.stdout.strip():
        lines.append("=== Recent commits (last 20) ===")
        lines.append(result.stdout.strip())
        lines.append("")

    return "\n".join(lines)


def call_openrouter(prompt: str, model: str, api_key: str) -> str:
    """Call the OpenRouter chat completions API."""
    import requests

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 16000,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/opusrationalis",
        "X-Title": "OpusRationalis Ralph Runner",
    }

    resp = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=600)
    resp.raise_for_status()

    data = resp.json()
    return data["choices"][0]["message"]["content"]


def parse_ralph_block(response: str):
    """Parse the ```ralph ... ``` block from the agent response."""
    match = re.search(r"```ralph\s*\n(.*?)```", response, re.DOTALL)
    if not match:
        return None, None, None, [], []

    block = match.group(1)

    # Parse commit subject and body
    subject_match = re.search(r"^COMMIT_SUBJECT:\s*(.+)$", block, re.MULTILINE)
    body_match = re.search(r"^COMMIT_BODY:\s*(.+)$", block, re.MULTILINE)
    next_model_match = re.search(r"^NEXT_MODEL:\s*(.+)$", block, re.MULTILINE)
    commit_subject = subject_match.group(1).strip() if subject_match else None
    commit_body = body_match.group(1).replace("\\n", "\n").strip() if body_match else ""
    next_model = next_model_match.group(1).strip() if next_model_match else None

    # Parse FILE blocks
    files = []
    for file_match in re.finditer(
        r"^FILE:\s*(.+?)\s*\nCONTENT:\n(.*?)^END_FILE",
        block, re.MULTILINE | re.DOTALL,
    ):
        files.append((file_match.group(1).strip(), file_match.group(2)))

    # Parse DELETE lines
    deletes = []
    for del_match in re.finditer(r"^DELETE:\s*(.+)$", block, re.MULTILINE):
        deletes.append(del_match.group(1).strip())

    return commit_subject, commit_body, next_model, files, deletes


def apply_changes(files, deletes):
    """Write files and delete paths."""
    changed = []

    for rel_path, content in files:
        full = REPO_ROOT / rel_path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")
        changed.append({"action": "write", "path": rel_path})
        print(f"  wrote: {rel_path}")

    for rel_path in deletes:
        full = REPO_ROOT / rel_path
        if full.exists():
            full.unlink()
            changed.append({"action": "delete", "path": rel_path})
            print(f"  deleted: {rel_path}")

    return changed


def write_run_log(timestamp, model, sha_before, prompt, response, changed):
    """Write a reproducibility log to runs/."""
    runs_dir = REPO_ROOT / "runs"
    runs_dir.mkdir(exist_ok=True)

    log_name = timestamp.strftime("%Y-%m-%d-%H%M%S") + ".json"
    log_path = runs_dir / log_name

    log = {
        "timestamp": timestamp.isoformat(),
        "model": model,
        "git_sha_before": sha_before,
        "prompt": prompt,
        "response": response,
        "files_changed": changed,
    }

    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  run log: runs/{log_name}")
    return f"runs/{log_name}"


def write_commit_msg(subject, body, model):
    """Write the commit message to .ralph_commit_msg for the workflow to pick up."""
    msg = subject or f"ralph: {datetime.now(timezone.utc).strftime('%Y-%m-%d')} {model} — no-op run"
    if body:
        msg += "\n\n" + body
    (REPO_ROOT / ".ralph_commit_msg").write_text(msg, encoding="utf-8")


def main():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    timestamp = datetime.now(timezone.utc)
    sha_before = get_git_sha()

    # --- Model selection priority: env var > STATE.md > default ---
    env_model = os.environ.get("MODEL")
    state_model = read_next_model_from_state()

    if env_model:
        model = env_model
        print(f"Model (from env override): {model}")
    elif state_model:
        model = state_model
        print(f"Model (from STATE.md next_model): {model}")
    else:
        model = DEFAULT_MODEL
        print(f"Model (default): {model}")

    current_provider = get_provider(model)

    print(f"Ralph run: {timestamp.isoformat()}")
    print(f"SHA: {sha_before}")
    print(f"Provider: {current_provider}")

    # --- Fetch available models for rotation ---
    print("Fetching available models from OpenRouter...")
    available_models = fetch_available_models(api_key)

    # Build the list of eligible next models (different provider only)
    eligible_next = [m for m in available_models if get_provider(m) != current_provider]
    models_list_text = "\n".join(f"  - {m}" for m in eligible_next) if eligible_next else "  (none available)"

    # Build prompt
    project_md = read_project_md()
    state_summary = gather_state_summary()

    prompt = (
        f"# PROJECT.md\n\n{project_md}\n\n"
        f"# Current Repository State\n\n{state_summary}\n\n"
        f"# Current Model\n\nYou are running as: `{model}` (provider: {current_provider})\n\n"
        f"# Available Models for NEXT_MODEL (different provider only)\n\n"
        f"{models_list_text}\n\n"
        f"Proceed per the instructions in PROJECT.md."
        f"{RESPONSE_FORMAT}"
    )

    print(f"Prompt length: {len(prompt)} chars")
    print("Calling OpenRouter...")

    response = call_openrouter(prompt, model, api_key)
    print(f"Response length: {len(response)} chars")

    # Parse and apply
    commit_subject, commit_body, next_model, files, deletes = parse_ralph_block(response)
    changed = []

    if files or deletes:
        print("Applying changes...")
        changed = apply_changes(files, deletes)
    else:
        print("No file changes in response (no-op run).")

    # --- Persist next model choice ---
    if next_model and next_model in available_models and get_provider(next_model) != current_provider:
        print(f"Next model (agent chose): {next_model}")
        write_next_model_to_state(next_model)
    else:
        if next_model:
            print(f"  WARNING: Agent chose '{next_model}' but it's invalid or same provider. Picking fallback.")
        fallback = pick_fallback_model(available_models, current_provider)
        print(f"Next model (fallback): {fallback}")
        write_next_model_to_state(fallback)

    # Write run log (always)
    log_path = write_run_log(timestamp, model, sha_before, prompt, response, changed)
    changed.append({"action": "write", "path": log_path})

    # Write commit message
    write_commit_msg(commit_subject, commit_body, model)

    print("Done.")


if __name__ == "__main__":
    main()
