# Claude Code Setup Instructions

Set up a self-running agentic pipeline in this repository. The pipeline is a "Ralph loop": a single long-lived project file (`PROJECT.md`) is fed to an agent on a schedule, the agent reads current repository state, performs the smallest meaningful unit of work toward the goals described in `PROJECT.md`, commits its results with a structured message, and the next scheduled run picks up from there. Everything the project needs to know about itself lives in `PROJECT.md`. Your job is to build the runner, not the project.

## What to build

1. **A GitHub Actions workflow** at `.github/workflows/ralph.yml` that:
   - Runs on a daily schedule (`cron: '0 3 * * *'`) and on manual dispatch.
   - Checks out the repository with write permissions (`contents: write`).
   - Installs Python 3.11+ and `requests`.
   - Executes `scripts/ralph_run.py`.
   - Commits any changes with a structured message (see below) and pushes to `main`.
   - Has a job timeout of 5 hours and uses `concurrency` with `cancel-in-progress: false` to prevent overlapping runs.

2. **A runner script** at `scripts/ralph_run.py` that:
   - Reads `PROJECT.md` as the master instruction document. If it does not exist, exit with a clear error — `PROJECT.md` is the source of truth and is provided separately, do not generate it.
   - Reads the current repository state (the `state/` directory, whose layout `PROJECT.md` defines; on first run this may be empty and that is fine).
   - Calls the OpenRouter API at `https://openrouter.ai/api/v1/chat/completions` using `OPENROUTER_API_KEY` from GitHub secrets.
   - Uses Claude Opus 4.6 as the primary model (model id: `anthropic/claude-opus-4.6`). Make the model id configurable via a `MODEL` environment variable so cross-family audit runs can swap it later.
   - Sends `PROJECT.md` plus a compact summary of current repository state as the prompt. Receives the agent's response and applies the file changes it specifies. The response format (how the agent tells the runner which files to create, edit, or delete, and what commit message to use) is defined inside `PROJECT.md` itself — the runner just parses what `PROJECT.md` tells it to parse.
   - Writes a run log to `runs/YYYY-MM-DD-HHMMSS.json` containing: timestamp, model id, git SHA before the run, full prompt, full response, and the list of files changed. Every run must be reproducible from its log alone.
   - Exits 0 on success even if no files changed — a no-op day is valid.

3. **A commit convention**: every run commits as
   `ralph: <YYYY-MM-DD> <model-id> — <one-line summary>`
   with a longer summary in the commit body. The agent supplies both lines as part of its structured response.

4. **GitHub Pages hosting**: configure Pages to serve from `main` branch, `/site` directory. Do not build the site yourself — `PROJECT.md` will direct the agent to build it incrementally. Just point Pages at `/site` so whatever appears there gets served.

## Secrets required

- `OPENROUTER_API_KEY` — set in repository secrets before the first run.
- `GITHUB_TOKEN` — provided automatically; grant it `contents: write` in the workflow.

## What not to do

- Do not implement any domain logic (theology, debates, graph building, profile handling). All of that is the agent's job, directed by `PROJECT.md`.
- Do not hardcode prompts beyond "here is `PROJECT.md`, here is current state, proceed per its instructions." Intelligence lives in the project file, not the runner.
- Do not pre-create `state/`, `site/`, or any content directory. The agent creates what it needs, guided by `PROJECT.md`.
- Do not add retries, self-correction, or fallback logic beyond basic error handling. If a run fails, it fails; the next day's run sees the state and recovers.

Keep the runner boring and legible. It should be well under 300 lines of Python. Everything interesting happens inside `PROJECT.md`.
