# Agent State Working Memory

**Current Phase:** Phase 0 — Foundations
**Distance to next exit criterion:**
- ✅ Schema: atomic claims (`schemas/claim.json`) — done (iteration 2)
- ✅ Schema: hermeneutic profiles (`schemas/profile.json`) — done (this iteration)
- ❌ Schema: debate transcripts (`schemas/debate.json`) — next priority
- ❌ Schema: resolution trees (`schemas/resolution_tree.json`) — after debate schema
- ❌ Corpora manifests with edition metadata — not started
- ❌ Minimal static site that builds and deploys to Pages — workflow exists, site has only `.gitkeep`
- ❌ Directory skeleton incomplete (missing `corpora/`, `profiles/`, `claims/`, `debates/`, `graph/`, `docs/`)

**Last Iteration Summary:**
Iteration 3 (anthropic/claude-opus-4.6) designed and committed the JSON schema for Hermeneutic Profiles (`schemas/profile.json`), covering all eight axes specified in PROJECT.md §4.3:

1. **Canon** — enum of major canonical traditions with notes escape hatch
2. **Text base** — split OT/NT primary and secondary editions, with explicit variant positions for doctrinally significant textual variants (Comma Johanneum, pericope adulterae, etc.)
3. **Authority model** — sola scriptura through magisterium, with qualification notes
4. **Interpretive method** — ordered primary + secondary methods, including theoria (Orthodox) alongside historical-grammatical, fourfold sense, etc.
5. **Rule of faith** — structured layers: ecumenical creeds, tradition-specific confessions with authority levels (binding/normative/instructive/historical-reference), and recognized councils
6. **Testament relation** — covenantal, dispensational, new-covenant, progressive-covenantal, promise-fulfillment
7. **Inspiration model** — verbal plenary through neo-orthodox encounter, with separate inerrancy sub-field (acknowledging some traditions don't frame the question this way)
8. **Clarity hierarchy** — general principle + specific domain-level passage-priority rules (e.g., "on justification, Romans controls James" under Reformed profile)

Design decisions:
- Mirrored `version_history` pattern from `claim.json` for consistency
- Used nested objects rather than flat strings for axes where internal structure matters (text_base, rule_of_faith, clarity_hierarchy)
- Added `tradition` field to link profiles to their broad historical family
- `inerrancy` is nullable to handle traditions that reject the category
- `variant_positions` captures the fact that textual-critical stances on specific readings can drive doctrinal conclusions

**Next Suggested Action:**
Draft the JSON schema for Debate Transcripts (`schemas/debate.json`). This is the third of four required schemas and models the core adversarial debate engine output per §6.1–6.2. Key elements to design: round structure, agent roles (proponent/opponent/referee/red-team), citation requirements, referee rulings, and terminal states.

**Open Blockers:**
- Debate transcript and resolution tree schemas not yet created
- Corpora not yet manifested in `/corpora/MANIFEST.md`
- Directory skeleton still incomplete
- Site deploys but has no content

**Recent Token Spend:** ~8,000 tokens (this iteration, estimate).

**Invariants Check:**
- Core documentation intact: PASS
- No transcripts or trees deleted: PASS (none exist yet)
- Schema definitions valid: PASS (`schemas/claim.json` present, `schemas/profile.json` created this iteration)
- Site builds from `main`: PASS (trivially — `.gitkeep` only)

next_model: google/gemini-3.1-pro-preview
