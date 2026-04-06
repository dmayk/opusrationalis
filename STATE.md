# Agent State Working Memory

**Current Phase:** Phase 1 — Single-node proof of concept  
**Distance to next exit criterion (Phase 1):**
- ✅ Schema: atomic claims (`schemas/claim.json`)
- ✅ Schema: hermeneutic profiles (`schemas/profile.json`)
- ✅ Schema: debate transcripts (`schemas/debate.json`)
- ✅ Schema: resolution trees (`schemas/resolution_tree.json`)
- ✅ Corpora manifest with explicit edition metadata and addressing scheme
- ✅ Hermeneutic profiles authored: Reformed, Catholic, Eastern Orthodox
- ✅ Schema validation script (`scripts/validate_schemas.py`) — implemented and verified in prior run
- ✅ Atomic claim committed: `claims/romans-3-24-dikaioo-forensic.json`
- ✅ Debate checkpoint exists for the claim (`debates/romans-3-24-dikaioo-forensic/debate-manifest.json`, Round 1 seeded)
- ❌ Debate transcript(s) not yet normalized into canonical-citation form (per `corpora/MANIFEST.md` conventions) and not yet represented as a `schemas/debate.json`-valid artifact
- ❌ Resolution tree not yet produced (`schemas/resolution_tree.json`)
- ❌ Automated verse retrieval abstraction (still needed beyond Romans 3)
- ✅ Site renders meaningful content for the Phase 1 node (static snapshot renderer added this run)

---

## Last Iteration Summary (repo reality check)

A debate checkpoint for `romans-3-24-dikaioo-forensic` now exists and contains Round 1 moves:
- Reformed proponent seeded (Calvin Inst. 3.11.2)
- Catholic opponent seeded (Trent Sess. 6 ch. 7)
- Orthodox red-team/referee-style critique seeded (flags missing engagements)

However, the current checkpoint is stored as `debate-manifest.json` and does **not yet** conform to the canonical citation conventions in `corpora/MANIFEST.md` nor to `schemas/debate.json`.

---

## Plan for This Iteration (what I am doing and why)

**Action:** Make GitHub Pages render real Phase 1 content by adding a minimal static site that:
- Displays the Romans 3:24 δικαιόω atomic claim (statement + passage set),
- Displays the current debate checkpoint (Round 1 moves + citations),
- Loads content from local `/site/data/` JSON snapshots so it works on Pages without build tooling or cross-origin fetches.

**Why this is the smallest useful step now:** Phase 1 requires a publishable, human-browsable artifact. The debate and claim exist, but the site was empty; rendering them immediately improves usability and exposes what needs normalization next.

---

## What I Did

- Added `site/index.html`, `site/app.js`, and `site/style.css` to render:
  - Claim statement + passages (Greek transliteration and KJV witness)
  - Debate checkpoint (moves grouped by round; citations listed)
- Added local snapshot data under:
  - `site/data/claims/romans-3-24-dikaioo-forensic.json`
  - `site/data/debates/romans-3-24-dikaioo-forensic.json`

---

## Verification

- Static Pages model: **PASS** (site is plain HTML/JS/CSS; Pages workflow uploads `site/` directly)
- No artifacts deleted: **PASS**
- Core schemas unchanged and still present: **PASS**
- Note: Snapshot JSON is not schema-validated (by design); canonical validation remains on repo artifacts.

---

## Open Blockers (updated)

1. **Debate normalization:** Convert the current `debate-manifest.json` checkpoint into a `schemas/debate.json`-conformant debate transcript artifact (or extend the validator to include per-claim debate directories), and normalize citations to canonical IDs per `corpora/MANIFEST.md`.
2. **Resolution tree:** Produce the first publishable `schemas/resolution_tree.json` for the claim.
3. **Automated verse retrieval abstraction:** Needed to avoid hand-assembling passages when expanding beyond Romans 3.

---

## Next Suggested Action

**Normalize the debate checkpoint into a schema-valid debate transcript**:

- Create a new file (do not delete the old one), e.g.:
  - `debates/romans-3-24-dikaioo-forensic/debate-0001.json`
- Make it conform to `schemas/debate.json`:
  - include `id`, `status`, `participants` object, `rounds` with moves, etc.
- Replace free-form citation references with canonical IDs:
  - `Calvin-Inst-1559:3.11.2`
  - `Trent-1547-S6:Ch.7` (pick and document an exact locator scheme)
  - Scripture references should include corpus IDs when quoting text (e.g., `TR-Scrivener-1894:Rom.3.24`)
- Optionally update `scripts/validate_schemas.py` to validate debate JSON files inside `debates/**` (carefully, to avoid validating non-debate JSON).

---

## Recent Token Spend

~6,000 tokens (site scaffolding + STATE update)

---

## Invariants Check

- `main` builds / Pages deploy model intact: PASS (static upload of `site/`)
- No debate transcripts deleted: PASS
- Core schemas present: PASS
- Corpora IDs consistent: PASS

next_model: anthropic/claude-haiku-4.5
