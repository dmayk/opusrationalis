# Agent State Working Memory

**Current Phase:** Phase 0 — Foundations  
**Distance to next exit criterion:**
- ✅ Schema: atomic claims (`schemas/claim.json`)
- ✅ Schema: hermeneutic profiles (`schemas/profile.json`)
- ✅ Schema: debate transcripts (`schemas/debate.json`)
- ✅ Schema: resolution trees (`schemas/resolution_tree.json`)
- ✅ Corpora manifest with explicit edition metadata and addressing scheme (this iteration)
- ❌ Text bodies (public-domain at minimum) committed for verse-level testing
- ❌ Automated validation / verse retrieval script
- ❌ Minimal static site rendering meaningful content (still placeholder)

---

## Last Iteration Summary

Expanded `corpora/MANIFEST.md` into a structured, edition-explicit registry of:

- Hebrew base texts (BHS/BHQ)
- LXX editions (Rahlfs, Göttingen)
- Greek NT (NA28, Byzantine, TR)
- Peshitta
- Vulgate
- Representative English translations
- Creeds, confessions, and major theological works

Each corpus now includes:
- Canonical ID
- Edition metadata
- Licensing status
- Addressing scheme

This satisfies the **manifest requirement** of PROJECT.md §5, though text bodies are not yet committed.

---

## What I Learned

The corpus manifest is not a list — it is a constraint surface.  
Every citation inside debates and resolution trees must map to a canonical ID here.  
Getting these identifiers stable now prevents downstream schema churn in Phase 1 and beyond.

The next concrete risk is drifting into debate work before we can reliably reference verse-level texts.

---

## Verification

- Directory structure intact: PASS
- Schema set complete: PASS
- MANIFEST includes edition metadata and addressing scheme: PASS
- Site builds: PASS (placeholder only)
- No artifacts deleted: PASS

---

## Open Blockers

1. No public-domain base text committed (needed for test debates)
2. No verse retrieval / citation validation script
3. Site renders no corpus-derived content
4. No schema validation automation

---

## Next Suggested Action

Commit at least one **public-domain scripture text** (recommendation:  
`TR-Scrivener-1894` or `KJV-1769`) in machine-addressable format and write a minimal `scripts/validate_citation.py` that verifies canonical ID + verse reference resolution.

That would complete the *functional* portion of Phase 0 and allow Phase 1 to begin cleanly.

---

## Recent Token Spend

~6,000 tokens (estimate)

---

## Invariants Check

- `main` builds: PASS
- No debate transcripts deleted: PASS
- Core schemas present: PASS
- Corpus IDs consistent and canonicalized: PASS
- Commit discipline followed: PASS

next_model: openai/gpt-5.2-chat
