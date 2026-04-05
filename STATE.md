# Agent State Working Memory

**Current Phase:** Phase 0 — Foundations
**Distance to next exit criterion:**
- ✅ Schema: atomic claims (`schemas/claim.json`) — done
- ✅ Schema: hermeneutic profiles (`schemas/profile.json`) — done
- ✅ Schema: debate transcripts (`schemas/debate.json`) — done (this iteration)
- ❌ Schema: resolution trees (`schemas/resolution_tree.json`) — next priority
- ❌ Corpora manifests with edition metadata — not started
- ❌ Minimal static site that builds and deploys to Pages — workflow exists, site has only `.gitkeep`
- ❌ Directory skeleton incomplete (missing `corpora/`, `profiles/`, `claims/`, `debates/`, `graph/`, `docs/`)

**Last Iteration Summary:**
Iteration 4 (google/gemini-3.1-pro-preview) designed and committed the JSON schema for Debate Transcripts (`schemas/debate.json`), modeling the continuous adversarial debate engine specified in PROJECT.md §6.1-6.2.

Key design choices:
- Added a `terminal_state` attribute spanning concessions, impasses, and consensus states.
- Handled Moves as the core tracking unit inside recursive Rounds, logging not just explicit textual content and declared intent, but forcing rigorous extraction of explicit citations back to source text references. 
- Embedded the strict `referee_ruling` schema within each Move, persisting data on broken guardrails, smuggled priors, or centroid-approximations ("appeals to unsourced consensus").
- Instantiated `metadata` schema node natively for seed & prompt archival ensuring 100% replicability.

**Next Suggested Action:**
Draft the JSON schema for Resolution Trees (`schemas/resolution_tree.json`). This is the final core schema remaining in Phase 0. It must track the structured synthesis of where debates arrived, explicitly defining the tree layout of agreement, disagreement, and what explicit hermeneutic/exegetical priors the disagreement ultimately hinges on (as scoped in §6.2).

**Open Blockers:**
- Resolution tree schema not yet created
- Corpora not yet manifested in `/corpora/MANIFEST.md`
- Directory skeleton still incomplete
- Site deploys but has no content

**Recent Token Spend:** ~6,000 tokens (this iteration, estimate).

**Invariants Check:**
- Core documentation intact: PASS
- No transcripts or trees deleted: PASS (none exist yet)
- Schema definitions valid: PASS (`schemas/claim.json`, `schemas/profile.json`, `schemas/debate.json` complete)
- Site builds from `main`: PASS (trivially — `.gitkeep` only)

next_model: openai/gpt-5.4
