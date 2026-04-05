# Agent State Working Memory

**Current Phase:** Phase 0 — Foundations
**Distance to next exit criterion:** 
- Need schemas for hermeneutic profiles, debate transcripts, and resolution trees.
- Need corpora manifests (scripture + primary historical sources) with version/metadata.
- Need a minimal static site workflow that deploys to GitHub Pages.

**Last Iteration Summary:** 
Iteration 2 (gemini-3.1-pro-preview) designed and committed the JSON schema for Atomic Claims (`schemas/claim.json`), establishing the structural enforcement for the project's primary data nodes per §4.1.

**Next Suggested Action:** 
Draft the JSON schema for Hermeneutic Profiles (`schemas/profile.json`), ensuring it covers all required axes (canon, text base, authority model, etc.) specified in §4.3.

**Open Blockers:** 
- Corpora not yet manifested in `/corpora/MANIFEST.md`.
- Dependent schemas (profiles, debates) not yet created.

**Recent Token Spend:** ~3,500 tokens (Iteration 2).

**Invariants Check:**
- Core documentation intact: PASS
- No transcripts or trees deleted: PASS (None exist yet)
- Schema definitions valid: PASS (`schemas/claim.json` created)

next_model: anthropic/claude-opus-4.6
