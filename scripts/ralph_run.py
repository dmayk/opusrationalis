#!/usr/bin/env python3
"""Ralph runner — reads PROJECT.md, calls OpenRouter with tools, applies file changes."""

import ipaddress
import json
import os
import random
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
DEFAULT_MODEL = "anthropic/claude-sonnet-4.6"
MAX_TOOL_ITERATIONS = 30
MAX_TOOL_OUTPUT_CHARS = 50_000

# Frontier-tier models eligible for rotation.
ELIGIBLE_MODELS = {
    "anthropic": ["anthropic/claude-opus-4.6", "anthropic/claude-sonnet-4.6"],
    "google": ["google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview"],
    "openai": ["openai/gpt-5.4", "openai/gpt-5.3-codex"],
    "qwen": ["qwen/qwen3.6-plus:free", "qwen/qwen3.5-397b-a17b"],
    "x-ai": ["x-ai/grok-4.20"],
    "mistralai": ["mistralai/mistral-small-2603"],
}

MIN_CONTEXT_LENGTH = 32_000

# Read-only git subcommands the agent is allowed to run.
GIT_ALLOWED_SUBCOMMANDS = {"log", "diff", "show", "blame", "ls-files", "shortlog", "status", "rev-parse"}

# ---------------------------------------------------------------------------
# Tool definitions (OpenAI function-calling format)
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "brave_search",
            "description": "Search the web using Brave Search. Use this to find scripture texts, theological works, scholarly articles, primary sources, and any other information needed for research.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query.",
                    },
                    "count": {
                        "type": "integer",
                        "description": "Number of results to return (default 5, max 20).",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Fetch the text content of a web page or file at a URL. Use this to read articles, download public domain texts, access scripture databases, or retrieve any web content found via brave_search.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to fetch.",
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to return (default 50000).",
                        "default": 50000,
                    },
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file from the repository. Use this to read schemas, debate transcripts, corpora, profiles, STATE.md, or any other repository file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File path relative to repository root (e.g. 'schemas/claim.json').",
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Line number to start reading from (0-based). Optional.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of lines to read. Optional.",
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git",
            "description": "Run a read-only git command. Allowed subcommands: log, diff, show, blame, ls-files, shortlog, status, rev-parse. Use this to inspect commit history, view diffs, blame lines, or list tracked files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "args": {
                        "type": "string",
                        "description": "Git arguments (e.g. 'log --oneline -10', 'diff HEAD~1', 'show HEAD:schemas/claim.json').",
                    },
                },
                "required": ["args"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# Tool executors
# ---------------------------------------------------------------------------


def _is_private_url(url: str) -> bool:
    """Check if a URL points to a private/localhost address."""
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return True
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return True
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback or ip.is_reserved
    except (ValueError, TypeError):
        return False


def execute_brave_search(args: dict) -> str:
    """Execute a Brave Search API call."""
    import requests

    api_key = os.environ.get("BRAVE_API_KEY")
    if not api_key:
        return "ERROR: BRAVE_API_KEY not configured."

    query = args.get("query", "")
    count = min(args.get("count", 5), 20)

    resp = requests.get(
        BRAVE_SEARCH_URL,
        params={"q": query, "count": count},
        headers={
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    results = []
    for item in data.get("web", {}).get("results", [])[:count]:
        results.append({
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "description": item.get("description", ""),
        })

    return json.dumps(results, indent=2, ensure_ascii=False)


def execute_web_fetch(args: dict) -> str:
    """Fetch text content from a URL."""
    import requests

    url = args.get("url", "")
    max_chars = min(args.get("max_chars", MAX_TOOL_OUTPUT_CHARS), MAX_TOOL_OUTPUT_CHARS)

    if not url.startswith(("http://", "https://")):
        return "ERROR: URL must start with http:// or https://"

    if _is_private_url(url):
        return "ERROR: Cannot fetch private/localhost URLs."

    try:
        resp = requests.get(
            url,
            headers={"User-Agent": "RalphRunner/1.0 (theological-research-bot)"},
            timeout=30,
            allow_redirects=True,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        return f"ERROR: Failed to fetch URL: {e}"

    content_type = resp.headers.get("content-type", "")

    if "text/html" in content_type:
        # Strip HTML tags for a rough plain-text extraction
        text = re.sub(r"<script[^>]*>.*?</script>", "", resp.text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
    else:
        text = resp.text

    return text[:max_chars]


def execute_read_file(args: dict) -> str:
    """Read a file from the repository."""
    rel_path = args.get("path", "")
    full_path = (REPO_ROOT / rel_path).resolve()

    # Path traversal check
    if not str(full_path).startswith(str(REPO_ROOT)):
        return "ERROR: Path must be within the repository."

    if not full_path.exists():
        return f"ERROR: File not found: {rel_path}"

    if not full_path.is_file():
        return f"ERROR: Not a file: {rel_path}"

    try:
        lines = full_path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return f"ERROR: Cannot read binary file: {rel_path}"

    offset = args.get("offset", 0)
    limit = args.get("limit")

    if limit is not None:
        lines = lines[offset:offset + limit]
    elif offset > 0:
        lines = lines[offset:]

    content = "\n".join(lines)
    return content[:MAX_TOOL_OUTPUT_CHARS]


def execute_git(args: dict) -> str:
    """Run a read-only git command."""
    raw_args = args.get("args", "")
    parts = raw_args.split()

    if not parts:
        return "ERROR: No git arguments provided."

    subcommand = parts[0]
    if subcommand not in GIT_ALLOWED_SUBCOMMANDS:
        return f"ERROR: git subcommand '{subcommand}' is not allowed. Allowed: {', '.join(sorted(GIT_ALLOWED_SUBCOMMANDS))}"

    result = subprocess.run(
        ["git"] + parts,
        capture_output=True, text=True, cwd=REPO_ROOT, timeout=30,
    )

    output = result.stdout
    if result.returncode != 0:
        output += f"\n[git exited with code {result.returncode}]\n{result.stderr}"

    return output[:MAX_TOOL_OUTPUT_CHARS]


TOOL_EXECUTORS = {
    "brave_search": execute_brave_search,
    "web_fetch": execute_web_fetch,
    "read_file": execute_read_file,
    "git": execute_git,
}


def execute_tool(name: str, arguments: dict) -> str:
    """Dispatch a tool call to the appropriate executor."""
    executor = TOOL_EXECUTORS.get(name)
    if not executor:
        return f"ERROR: Unknown tool '{name}'."
    try:
        return executor(arguments)
    except Exception as e:
        return f"ERROR: Tool '{name}' failed: {e}"


# ---------------------------------------------------------------------------
# Response format (appended to every prompt)
# ---------------------------------------------------------------------------

RESPONSE_FORMAT = """\

## Tools Available

You have access to the following tools during this run — use them freely:

- **brave_search(query, count?)** — Search the web for sources, scripture texts, scholarly works.
- **web_fetch(url, max_chars?)** — Fetch and read the content of a web page or text file.
- **read_file(path, offset?, limit?)** — Read any file in the repository.
- **git(args)** — Run read-only git commands (log, diff, show, blame, ls-files, shortlog, status).

Use these tools to research, verify, and ground your work in primary sources. Do not guess
at file contents or source material — read them. Do not assume what prior runs have done —
check the git log and read STATE.md.

## Response Format (required by the runner)

When you are done with your research and tool use, you MUST end your final response with a
structured block so the runner can apply your changes. Use exactly this format — the runner
parses it mechanically:

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

# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------


def get_provider(model_id: str) -> str:
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
        print("ERROR: PROJECT.md not found.", file=sys.stderr)
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def read_next_model_from_state() -> str | None:
    state_path = REPO_ROOT / "STATE.md"
    if not state_path.exists():
        return None
    content = state_path.read_text(encoding="utf-8")
    match = re.search(r"^next_model:\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def write_next_model_to_state(model_id: str):
    state_path = REPO_ROOT / "STATE.md"
    if state_path.exists():
        content = state_path.read_text(encoding="utf-8")
        if re.search(r"^next_model:\s*.+$", content, re.MULTILINE):
            content = re.sub(
                r"^next_model:\s*.+$", f"next_model: {model_id}",
                content, flags=re.MULTILINE,
            )
        else:
            content = content.rstrip() + f"\n\nnext_model: {model_id}\n"
        state_path.write_text(content, encoding="utf-8")
    else:
        state_path.write_text(f"next_model: {model_id}\n", encoding="utf-8")


def fetch_available_models(api_key: str) -> list[str]:
    import requests

    headers = {"Authorization": f"Bearer {api_key}"}
    resp = requests.get(OPENROUTER_MODELS_URL, headers=headers, timeout=30)
    resp.raise_for_status()
    all_models = resp.json().get("data", [])

    eligible_ids = set()
    for models in ELIGIBLE_MODELS.values():
        eligible_ids.update(models)

    available_ids = {m["id"] for m in all_models if m.get("context_length", 0) >= MIN_CONTEXT_LENGTH}
    valid = sorted(eligible_ids & available_ids)

    print(f"  Available eligible models: {len(valid)} of {len(eligible_ids)} curated")
    for mid in valid:
        print(f"    - {mid}")
    return valid


def pick_fallback_model(available_models: list[str], current_provider: str) -> str:
    candidates = [m for m in available_models if get_provider(m) != current_provider]
    if not candidates:
        return DEFAULT_MODEL
    return random.choice(candidates)


def gather_state_summary() -> str:
    lines = []

    state_path = REPO_ROOT / "STATE.md"
    if state_path.exists():
        lines.append("=== STATE.md ===")
        lines.append(state_path.read_text(encoding="utf-8"))
        lines.append("")

    lines.append("=== Repository top-level listing ===")
    for item in sorted(REPO_ROOT.iterdir()):
        if item.name.startswith("."):
            continue
        kind = "dir" if item.is_dir() else "file"
        lines.append(f"  {kind}: {item.name}")
    lines.append("")

    state_dir = REPO_ROOT / "state"
    if state_dir.is_dir():
        lines.append("=== state/ directory ===")
        for p in sorted(state_dir.rglob("*")):
            if p.is_file():
                rel = p.relative_to(REPO_ROOT)
                size = p.stat().st_size
                lines.append(f"  {rel} ({size} bytes)")
        lines.append("")

    result = subprocess.run(
        ["git", "log", "--oneline", "-20"],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    if result.returncode == 0 and result.stdout.strip():
        lines.append("=== Recent commits (last 20) ===")
        lines.append(result.stdout.strip())
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# OpenRouter tool-use loop
# ---------------------------------------------------------------------------


def call_openrouter_with_tools(messages: list, model: str, api_key: str, tools: list) -> tuple[str, str, list]:
    """
    Call OpenRouter in a loop, executing tool calls until the model produces
    a final text response. Returns (final_content, finish_reason, tool_call_log).
    """
    import requests

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/opusrationalis",
        "X-Title": "OpusRationalis Ralph Runner",
    }

    tool_call_log = []

    for iteration in range(MAX_TOOL_ITERATIONS):
        payload = {
            "model": model,
            "messages": messages,
            "tools": tools,
            "max_tokens": 64000,
        }

        print(f"  API call #{iteration + 1} (messages: {len(messages)})...")
        resp = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=600)
        resp.raise_for_status()

        data = resp.json()
        choice = data["choices"][0]
        finish_reason = choice.get("finish_reason", "unknown")
        message = choice["message"]

        # Append the assistant message to conversation history
        messages.append(message)

        # Check if the model wants to call tools
        tool_calls = message.get("tool_calls")
        if tool_calls:
            print(f"  Model requested {len(tool_calls)} tool call(s):")
            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                fn_args_raw = tc["function"]["arguments"]
                tc_id = tc["id"]

                try:
                    fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                except json.JSONDecodeError:
                    fn_args = {}

                # Log
                args_summary = fn_args_raw[:200] if isinstance(fn_args_raw, str) else json.dumps(fn_args)[:200]
                print(f"    -> {fn_name}({args_summary})")

                # Execute
                result = execute_tool(fn_name, fn_args)
                result_preview = result[:200] + "..." if len(result) > 200 else result
                print(f"       <- {len(result)} chars: {result_preview}")

                # Record in log
                tool_call_log.append({
                    "iteration": iteration + 1,
                    "tool": fn_name,
                    "arguments": fn_args,
                    "result_length": len(result),
                    "result_preview": result[:500],
                })

                # Append tool result to conversation
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc_id,
                    "content": result,
                })

            continue  # Loop back for the model's next response

        # No tool calls — this is the final response
        content = message.get("content", "")
        print(f"  Final response: {len(content)} chars, finish_reason: {finish_reason}")

        if finish_reason == "length":
            print("  WARNING: Response was truncated (hit max_tokens limit).")

        return content, finish_reason, tool_call_log

    # Exhausted iterations
    print(f"  WARNING: Hit max tool iterations ({MAX_TOOL_ITERATIONS}).")
    last_content = messages[-1].get("content", "") if messages else ""
    return last_content, "max_iterations", tool_call_log


# ---------------------------------------------------------------------------
# Ralph block parsing and file application
# ---------------------------------------------------------------------------


def parse_ralph_block(response: str):
    match = re.search(r"```ralph\s*\n(.*?)```", response, re.DOTALL)
    if not match:
        return None, None, None, [], []

    block = match.group(1)

    subject_match = re.search(r"^COMMIT_SUBJECT:\s*(.+)$", block, re.MULTILINE)
    body_match = re.search(r"^COMMIT_BODY:\s*(.+)$", block, re.MULTILINE)
    next_model_match = re.search(r"^NEXT_MODEL:\s*(.+)$", block, re.MULTILINE)
    commit_subject = subject_match.group(1).strip() if subject_match else None
    commit_body = body_match.group(1).replace("\\n", "\n").strip() if body_match else ""
    next_model = next_model_match.group(1).strip() if next_model_match else None

    files = []
    for file_match in re.finditer(
        r"^FILE:\s*(.+?)\s*\nCONTENT:\n(.*?)^END_FILE",
        block, re.MULTILINE | re.DOTALL,
    ):
        files.append((file_match.group(1).strip(), file_match.group(2)))

    deletes = []
    for del_match in re.finditer(r"^DELETE:\s*(.+)$", block, re.MULTILINE):
        deletes.append(del_match.group(1).strip())

    return commit_subject, commit_body, next_model, files, deletes


def apply_changes(files, deletes):
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


def write_run_log(timestamp, model, sha_before, prompt, response, changed, tool_call_log):
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
        "tool_calls": tool_call_log,
        "files_changed": changed,
    }

    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  run log: runs/{log_name}")
    return f"runs/{log_name}"


def write_commit_msg(subject, body, model):
    msg = subject or f"ralph: {datetime.now(timezone.utc).strftime('%Y-%m-%d')} {model} — no-op run"
    if body:
        msg += "\n\n" + body
    (REPO_ROOT / ".ralph_commit_msg").write_text(msg, encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    timestamp = datetime.now(timezone.utc)
    sha_before = get_git_sha()

    # --- Model selection: env var > STATE.md > default ---
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
    eligible_next = [m for m in available_models if get_provider(m) != current_provider]
    models_list_text = "\n".join(f"  - {m}" for m in eligible_next) if eligible_next else "  (none available)"

    # --- Build initial prompt ---
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
    print("Starting tool-use loop...")

    messages = [{"role": "user", "content": prompt}]

    response, finish_reason, tool_call_log = call_openrouter_with_tools(
        messages, model, api_key, TOOL_DEFINITIONS,
    )

    print(f"Tool calls made: {len(tool_call_log)}")

    truncated = finish_reason == "length"

    # --- Parse and apply ---
    commit_subject, commit_body, next_model, files, deletes = parse_ralph_block(response)
    changed = []

    if truncated:
        print("Skipping file changes due to truncated response.")
    elif files or deletes:
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

    # --- Write run log ---
    log_path = write_run_log(timestamp, model, sha_before, prompt, response, changed, tool_call_log)
    changed.append({"action": "write", "path": log_path})

    write_commit_msg(commit_subject, commit_body, model)

    print("Done.")


if __name__ == "__main__":
    main()
