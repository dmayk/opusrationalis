#!/usr/bin/env python3
"""
Generate site/data/bundle.json and site/data/runs/index.json from canonical
repository data. No files are copied — only lean generated indexes are produced.

Run from repo root:  python3 scripts/sync_site_data.py
"""

import json
import glob
import os
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DATA = os.path.join(REPO_ROOT, "site", "data")


def load_json(path):
    with open(path) as f:
        return json.load(f)


def build_runs_index():
    """Build lean metadata index from runs/*.json (no prompts/responses)."""
    runs_dir = os.path.join(REPO_ROOT, "runs")
    entries = []
    for path in sorted(glob.glob(os.path.join(runs_dir, "*.json"))):
        d = load_json(path)
        entries.append({
            "file": os.path.basename(path),
            "timestamp": d.get("timestamp", ""),
            "model": d.get("model", ""),
            "filesChanged": len(d.get("files_changed", [])),
            "toolCalls": len(d.get("tool_calls", [])),
        })
    return entries


def load_claims():
    """Load all claims from claims/*.json."""
    claims = {}
    for path in sorted(glob.glob(os.path.join(REPO_ROOT, "claims", "*.json"))):
        d = load_json(path)
        cid = d.get("id", os.path.basename(path).replace(".json", ""))
        claims[cid] = d
    return claims


def load_profiles():
    """Load all profiles from profiles/*.json."""
    profiles = {}
    for path in sorted(glob.glob(os.path.join(REPO_ROOT, "profiles", "*.json"))):
        d = load_json(path)
        pid = d.get("id", os.path.basename(path).replace(".json", ""))
        profiles[pid] = d
    return profiles


def load_trees():
    """Load all resolution trees from graph/resolution_trees/*.json."""
    trees = {}
    for path in sorted(glob.glob(os.path.join(REPO_ROOT, "graph", "resolution_trees", "*.json"))):
        d = load_json(path)
        tid = d.get("id", os.path.basename(path).replace(".json", ""))
        trees[tid] = d
    return trees


def load_doctrines():
    """Load all doctrine nodes from graph/doctrine-*.json."""
    doctrines = []
    for path in sorted(glob.glob(os.path.join(REPO_ROOT, "graph", "doctrine-*.json"))):
        doctrines.append(load_json(path))
    return doctrines


def find_debate_for_claim(claim_id):
    """Find the best debate file for a claim, handling inconsistent directory naming."""
    debates_dir = os.path.join(REPO_ROOT, "debates")
    if not os.path.isdir(debates_dir):
        return None

    # Try exact match first
    exact = os.path.join(debates_dir, claim_id, "debate-0001.json")
    if os.path.exists(exact):
        return load_json(exact)

    # Search all debate directories for a file whose claim_id matches
    for ddir in sorted(os.listdir(debates_dir)):
        dpath = os.path.join(debates_dir, ddir, "debate-0001.json")
        if os.path.exists(dpath):
            d = load_json(dpath)
            cid = d.get("claim_id", "")
            # Normalize for comparison (handle hyphens vs underscores)
            if cid.replace("_", "-").replace(":", "-") == claim_id.replace("_", "-").replace(":", "-"):
                return d

    # Fallback: directory name contains the claim id (partial match)
    for ddir in sorted(os.listdir(debates_dir)):
        normalized_dir = ddir.replace("_", "-")
        normalized_claim = claim_id.replace("_", "-")
        if normalized_claim in normalized_dir or normalized_dir in normalized_claim:
            dpath = os.path.join(debates_dir, ddir, "debate-0001.json")
            if os.path.exists(dpath):
                return load_json(dpath)

    return None


def derive_human_title(claim):
    """Generate a human-readable title from a claim.

    Strategy: use passage refs as prefix if available, then truncate statement.
    Fully generic — works for any future claim topic, not just δικαιόω.
    """
    stmt = claim.get("statement", "")
    cid = claim.get("id", "")

    # Reuse the standard passage ref extractor
    refs = derive_passage_refs(claim)

    # Build prefix from passage refs (max 2)
    prefix = ""
    if len(refs) >= 2:
        prefix = f"{refs[0]} / {refs[1]}"
    elif len(refs) == 1:
        prefix = refs[0]

    # Build a short description from the statement
    # Take the first sentence or first 60 chars, whichever is shorter
    desc = stmt.split(".")[0] if "." in stmt[:80] else stmt[:60]
    # Remove the passage reference from desc if it's redundant
    for ref in refs[:2]:
        desc = desc.replace(ref, "").strip(", ")
    # Clean up
    desc = desc.strip()
    if len(desc) > 60:
        desc = desc[:57] + "..."

    if prefix and desc:
        return f"{prefix} — {desc}"
    elif prefix:
        return prefix
    elif desc:
        return desc
    else:
        return cid


def derive_passage_refs(claim):
    """Extract short passage references from a claim (deduplicated).
    Handles both old format (reference: "Rom 3:24") and new format (book: "Rom", ref: "3:24").
    """
    seen = set()
    refs = []
    for p in claim.get("passages", []):
        ref = p.get("reference", "")
        if not ref:
            # New format: combine book + ref
            book = p.get("book", "")
            verse = p.get("ref", "")
            if book and verse:
                ref = f"{book} {verse}"
            elif verse:
                ref = verse
        if ref and ref not in seen:
            seen.add(ref)
            refs.append(ref)
    return refs


def build_bundle():
    """Build the complete site bundle from canonical data."""
    claims = load_claims()
    profiles = load_profiles()
    trees = load_trees()
    doctrines = load_doctrines()

    # Build tree lookup by claim_id
    tree_by_claim = {}
    for tid, tree in trees.items():
        cid = tree.get("claim_id", "")
        if cid:
            tree_by_claim[cid] = (tid, tree)

    # Build debate lookup
    debates = {}
    for cid in claims:
        debate = find_debate_for_claim(cid)
        if debate:
            debates[cid] = debate

    # Build the manifest (auto-generated, replaces hand-written index.json)
    manifest_doctrines = []
    claims_in_doctrines = set()

    for doctrine in doctrines:
        doc_entry = {
            "id": doctrine.get("id", ""),
            "title": doctrine.get("title", ""),
            "description": doctrine.get("description", ""),
            "claims": [],
        }
        for cid in doctrine.get("atomicClaims", []):
            claims_in_doctrines.add(cid)
            claim = claims.get(cid)
            if not claim:
                continue

            tree_id = None
            tree = None
            if cid in tree_by_claim:
                tree_id, tree = tree_by_claim[cid]

            has_debate = cid in debates

            # Derive profile outcomes from tree
            profile_outcomes = []
            metrics = {"stability": 0.0, "contestation": 0.0, "consensus": 0.0}
            status = claim.get("resolution_status") or claim.get("resolutionStatus") or "unresolved"

            if tree:
                status = tree.get("status", status)
                for po in tree.get("profile_outcomes", []):
                    profile_outcomes.append({
                        "profileId": po.get("profile_id", ""),
                        "outcome": po.get("outcome", ""),
                    })
                tm = tree.get("metrics", {})
                metrics = {
                    "stability": tm.get("stability_score", 0.0),
                    "contestation": tm.get("contestation_score", 0.0),
                    "consensus": tm.get("depth_of_consensus", 0.0),
                }

            doc_entry["claims"].append({
                "id": cid,
                "humanTitle": derive_human_title(claim),
                "status": status,
                "hasTree": tree is not None,
                "treeId": tree_id,
                "hasDebate": has_debate,
                "passages": derive_passage_refs(claim),
                "profileOutcomes": profile_outcomes,
                "metrics": metrics,
                "statement": claim.get("statement", ""),
            })

        manifest_doctrines.append(doc_entry)

    # Any claims not in a doctrine get an "Uncategorized" group
    orphan_claims = [cid for cid in claims if cid not in claims_in_doctrines]
    if orphan_claims:
        orphan_doc = {"id": "uncategorized", "title": "Uncategorized", "description": "", "claims": []}
        for cid in orphan_claims:
            claim = claims[cid]
            orphan_doc["claims"].append({
                "id": cid,
                "humanTitle": derive_human_title(claim),
                "status": claim.get("resolution_status") or claim.get("resolutionStatus") or "unresolved",
                "hasTree": False, "treeId": None, "hasDebate": cid in debates,
                "passages": derive_passage_refs(claim),
                "profileOutcomes": [], "metrics": {"stability": 0.0, "contestation": 0.0, "consensus": 0.0},
                "statement": claim.get("statement", ""),
            })
        manifest_doctrines.append(orphan_doc)

    # Profile summaries for sidebar/lens
    profile_summaries = []
    for pid, profile in sorted(profiles.items()):
        profile_summaries.append({
            "id": pid,
            "name": profile.get("name", pid),
            "tradition": profile.get("tradition", ""),
        })

    # Assemble bundle
    bundle = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "manifest": {
            "doctrines": manifest_doctrines,
            "profiles": profile_summaries,
            "system": {
                "repoUrl": "https://github.com/dmayk/opusrationalis",
            },
        },
        "claims": claims,
        "trees": trees,
        "debates": debates,
        "profiles": profiles,
    }

    return bundle


def main():
    os.makedirs(os.path.join(SITE_DATA, "runs"), exist_ok=True)

    # Generate runs index
    runs_index = build_runs_index()
    runs_path = os.path.join(SITE_DATA, "runs", "index.json")
    with open(runs_path, "w") as f:
        json.dump(runs_index, f, indent=2)
    print(f"  runs/index.json: {len(runs_index)} runs")

    # Generate bundle
    bundle = build_bundle()
    bundle_path = os.path.join(SITE_DATA, "bundle.json")
    with open(bundle_path, "w") as f:
        json.dump(bundle, f, indent=2)

    n_claims = len(bundle["claims"])
    n_trees = len(bundle["trees"])
    n_debates = len(bundle["debates"])
    n_profiles = len(bundle["profiles"])
    size_kb = os.path.getsize(bundle_path) / 1024
    print(f"  bundle.json: {n_claims} claims, {n_trees} trees, {n_debates} debates, {n_profiles} profiles ({size_kb:.1f} KB)")


if __name__ == "__main__":
    print("Syncing site data...")
    main()
    print("Done.")
