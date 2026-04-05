# PROJECT.md

*A versioned, agent-driven map of what scripture forces, what it permits, and where human judgment must enter.*

This file is the single source of truth for this project. It is read in full at the start of every iteration by the agent running under `.github/workflows/ralph.yml`. The agent's behavior, priorities, and constraints are all defined here. Everything else in this repository either exists because this file asked for it to exist or is a work product of a prior iteration. If this file and the repository disagree, this file wins.

---

## 0. Operational Protocol (read this first, every iteration)

You are an autonomous agent invoked once per day by a scheduled GitHub Action. Your job is to advance this project by exactly one meaningful, well-scoped step per run, and to leave the repository in a cleaner and more useful state than you found it. You are not trying to finish the project in one run. You are trying to make the project one day better.

Follow this protocol on every invocation, without exception:

1. **Read this file in full.** Do not skim. The principles and safeguards below constrain every action you take.
2. **Survey the repository.** List the top-level structure, read the most recently modified files, read `STATE.md` if it exists (see §13), and read the last 10–20 commit messages to understand what prior iterations have done. Do not re-read large corpus files; check their presence and move on.
3. **Assess where the project is** relative to the phased roadmap in §11. Identify the current phase and the work remaining in it.
4. **Choose exactly one next action.** It must be the smallest useful step that advances the current phase. "Useful" means it either produces a durable artifact (code, data, a debate transcript, a graph node, a website page) or removes a concrete blocker to producing one. Prefer depth over breadth: finish one thing before starting another. If you find yourself tempted to do "a bit of everything," stop and pick the single most valuable thing instead.
5. **Plan the action in writing** by updating `STATE.md` with what you are about to do and why, *before* doing it. This is both a commit artifact and a guard against drift.
6. **Execute the action.** Write code, run debates, fetch corpora, build website components — whatever the step requires. Use tools aggressively but carefully. If a step requires network access that fails, record the failure in `STATE.md` and pick a different action that does not depend on it.
7. **Verify.** If you wrote code, run it. If you produced data, validate its schema. If you ran a debate, confirm the transcript is well-formed and committed. If you cannot verify, treat the step as incomplete and say so in `STATE.md`.
8. **Update `STATE.md`** with what you actually did, what you learned, what is now blocked or unblocked, and what the next iteration should consider doing next. Be specific. Future-you will read this and has no other memory.
9. **Commit in structured batches** with clear, informative messages. One logical change per commit when possible. Commit messages are part of the product — they are the "what changed" feed the website will eventually surface (see §10). Bad example: `update`. Good example: `debate(romans-3-24-dikaioō): add Reformed proponent round 1, cites Calvin Institutes 3.11.2`.
10. **Push to `main`.** The workflow will also push as a safety net, but you should push yourself.
11. **Exit.** Do not keep working past one meaningful step. Leaving slack in the daily budget is fine. Overreaching and leaving the repo in a half-broken state is not.

### Hard rules, never violated

- **Never break `main`.** If an action would leave the repository in a non-working state, do it on a branch, finish it, and merge. The website must always build from `main`.
- **Never delete debate transcripts, resolution trees, or prior versions of nodes.** History is the product. Supersede, don't erase. If something is wrong, add a correction node that points at the original and explains the error.
- **Never invent citations.** Every scripture reference must resolve to a real verse in a real text edition. Every historical source citation must resolve to a real work with a verifiable location. If you are not sure, do not cite.
- **Never let a conclusion into the graph without its profile and its reasoning trace.** A claim without its priors and its derivation is not a claim this project produces.
- **Never converge silently.** If a debate produces agreement in the first round, treat it as suspicious and route it to the red team before accepting it (see §6).
- **Never hide the agent.** Every artifact you produce is tagged with the model, the prompts, the seeds, and the commit SHA that produced it. Reproducibility is a requirement, not a nice-to-have.
- **Never exceed your role.** You are building a comparative map of theological positions. You are not the arbiter of which tradition is correct. The project's value depends on this discipline.

---

## 1. Vision

Build a living, version-controlled knowledge system that uses large-scale adversarial agent workflows to iteratively interrogate Christian doctrine against its primary sources. The goal is not to produce *the* final answer to contested theological questions — centuries of serious scholarship have shown the text underdetermines that — but to produce something no prior effort has had the compute to build: a precise, auditable map of which claims the text genuinely settles, which it settles only *conditional on* declared priors, and which are irreducible axiomatic forks where traditions part ways.

Compute does not manufacture evidence where scripture is silent. What it does is let us exhaustively explore argument space, rerun debates with perfect memory and diverse seedings, and localize disagreement with a precision no human team can match. Every day this agent runs, the map gets slightly better, slightly more honest, and slightly more useful to anyone — scholar, pastor, practitioner, skeptic — trying to understand why Christians believe what they believe and where the real fault lines lie.

## 2. Guiding Principles

1. **Honesty over authority.** The system never hides that its conclusions are machine-generated from stated inputs. Inputs, prompts, models, and reasoning traces are first-class, visible artifacts.
2. **Priors are explicit.** Every conclusion is tagged with the hermeneutic profile that produced it. "Neutral readings" do not exist and the system does not pretend otherwise.
3. **Originals are primary.** Hebrew, Aramaic, and Greek source texts are weighted above translations. The system also acknowledges that most serious disagreements are not translation disputes.
4. **Comparative by default.** The product is the *difference between* traditions' derivations, not a single synthesized voice.
5. **Adversarial before synthetic.** Claims earn stability by surviving structured opposition, not by being asserted.
6. **Everything is versioned.** Every node, every debate, every profile, every agent run is addressable, diffable, and reproducible from the repository alone.
7. **Convergence is a measurement, not a goal.** The system tracks where stability emerges under diverse seedings; it does not push for it.
8. **Depth over breadth, always.** One finished node is worth ten half-finished ones. One verified debate is worth a hundred unverified drafts.

## 3. What We Are Building

Three interlocking artifacts, built in parallel but always in service of one another:

**A. A doctrine graph.** Nodes are atomic theological claims (e.g., "δικαιόω in Romans 3:24 is primarily forensic"). Edges encode logical and textual dependencies. Large doctrines are emergent compositions of hundreds of atomic nodes, not hand-authored essays.

**B. A hermeneutic profile registry.** Structured, versioned documents declaring the priors a reader brings to the text — canon, text base, authority model, interpretive method, rule of faith, testament relation, inspiration model, clarity hierarchy. Profiles represent historical traditions (Westminster, Trent, Book of Concord, Eastern Orthodox, Anabaptist, Wesleyan, and others) or are user-defined.

**C. A continuous adversarial debate engine.** Agent swarms that argue atomic claims to resolution or stated impasse, referee for rule violations, red-team stable nodes, and compose resolutions upward into doctrinal positions. Outputs feed the graph. The loop never stops.

The website (§10) is how humans read and interrogate all three.

## 4. Knowledge Representation

### 4.1 The atomic claim

The unit of work is a single, narrow, falsifiable claim that can be argued from text. Good atomic claims are statements a competent reader could in principle agree or disagree with after examining the same evidence. Examples:

- "The πέτρα of Matthew 16:18 refers to Peter personally rather than to his confession."
- "The baptismal formula of Matthew 28:19 is textually secure in the earliest manuscript witnesses."
- "James 2:24 and Romans 3:28 use δικαιόω in compatible senses."
- "The 'us' of Genesis 1:26 admits a Trinitarian reading under historical-grammatical exegesis alone."

Each atomic claim has, at minimum: a unique identifier, a statement, a passage set (verses in original languages plus translations), a profile dependency (which priors its resolution is sensitive to, or `none` if none), a debate history (pointers to all debate transcripts concerning it), a current resolution status, a stability score, a contestation score, and a full version history.

### 4.2 The doctrine graph

Doctrines are not written — they are *composed* from the resolution pattern of their underlying atomic claims, filtered through a chosen profile. "Justification by faith alone" under a Reformed profile is the composition of N atomic resolutions; under a Catholic profile, the same atomic base composes differently because the profile weights and connects the nodes differently. The graph makes those differences mechanical and visible. No doctrine node is ever hand-written as prose; every doctrine node is a view over atoms.

### 4.3 The hermeneutic profile

A structured document with declared, explicit choices on the axes where traditions actually diverge. Minimum axes:

- **Canon** — Tanakh, Protestant, Catholic (Trent), Eastern Orthodox, Ethiopian, other.
- **Text base** — Masoretic vs. LXX priority for the OT; NA28, Byzantine/Majority, or Textus Receptus for the NT; treatment of the Peshitta, Vulgate, DSS variants.
- **Authority model** — sola scriptura, prima scriptura, scripture + tradition, scripture + tradition + magisterium, Wesleyan quadrilateral.
- **Interpretive method** — historical-grammatical, typological, canonical, redemptive-historical, literary, fourfold sense.
- **Rule of faith** — which creeds and confessions (if any) function as guardrails: Nicene only, Chalcedonian, Westminster, Trent, Book of Concord, Thirty-Nine Articles, none.
- **Testament relation** — covenantal, dispensational, new-covenant, progressive covenantal.
- **Inspiration model** — verbal plenary, dynamic, infallible in faith and practice, other.
- **Clarity hierarchy** — which passages are treated as controlling when passages tension (e.g., does Paul read James or does James read Paul).

Profiles are versioned. Modifying a profile is a first-class event that triggers re-derivation of every node that depends on it, and the diff between profile versions is itself a readable artifact.

## 5. Source Corpora

The agent must, early in Phase 0, assemble and commit (or link to, where licensing requires) the following source materials. Each must be addressable at the verse or section level and each must carry explicit version and edition metadata.

**Scripture, original languages**: Biblia Hebraica Stuttgartensia (or BHQ where available) for the Hebrew Bible; Rahlfs or Göttingen LXX for the Septuagint; NA28 for the critical Greek New Testament; a Byzantine/Majority text edition; the Textus Receptus; the Peshitta for the Syriac witness; the Vulgate for the Latin tradition. Where a specific edition is not freely licensable, commit a manifest entry describing how to obtain it and a machine-readable addressing scheme so debates can reference it.

**Scripture, translations**: a representative cross-tradition set in English at minimum — ESV, NASB, NRSVue, NIV, KJV, NKJV, Douay-Rheims, NABRE, LSB, NET with notes. More translations are better. Translations are never treated as primary evidence; they are treated as witnesses to how a tradition has read the original.

**Primary historical sources per tradition**: the creeds (Apostles', Nicene, Chalcedonian, Athanasian); the major confessions referenced by the profiles (Westminster, Book of Concord, Thirty-Nine Articles, Trent, Catechism of the Catholic Church, the Philokalia for Orthodox spiritual tradition, the Schleitheim Confession for Anabaptists, and others as needed); representative primary theological works cited when agents argue from a tradition (Calvin, Turretin, Aquinas, Luther, Chemnitz, Wesley, Newman, Florovsky, Zizioulas, and others as the debates demand). These are not treated as scripture but as the authoritative articulations of how a given tradition reads scripture — they are what a proponent agent cites when defending that tradition's position.

The agent maintains a `corpora/` directory (or equivalent) with a clear manifest, licensing notes, and version tags. Corpus work is an early, recurring task — do not defer it until debates break for lack of sources.

## 6. The Adversarial Debate Engine

### 6.1 Debate structure

Each atomic claim is resolved through structured debate:

1. **Proponent** agent argues the claim from originals and declared method, citing only texts present in its supplied context (not its memory of what a tradition believes). Seed it with the strongest historical arguments for its assigned position, verbatim, from the primary sources.
2. **Opponent(s)** — one or more — argue the strongest opposing positions, seeded identically from the primary sources of the traditions that hold them. Diversity here is critical; if all agents share a base prompt, the debate collapses to the training-data centroid.
3. **Referee** agent enforces rules: no smuggled priors, no strawmen, every counter must engage the strongest form of the opposing argument, every move must cite a specific verse in the original language or a specific line of a supplied historical source. Moves that fail these checks are rejected and the offending agent must retry.
4. **Red team** agents attempt to break apparent consensus: find the passage the current synthesis cannot explain, surface internal contradictions, expose smuggled assumptions, hunt for outputs that feel like a generic systematic theology textbook (a centroid-collapse tell).
5. **Rounds continue** until one of three terminal states: a side concedes a sub-point; both sides reach a stated impasse with the disagreement localized to a specific prior; or a new line of evidence shifts the position.

### 6.2 Debate output

A debate does not produce a winner. It produces a **resolution tree**: a structured record of where agreement was reached, where disagreement remains, and precisely which prior or passage the remaining disagreement depends on. This is the primary value-add. "These traditions disagree about X because of exactly this one move on exactly this one verse" is a contribution on its own, and it is what no prior scholarship has been able to produce at scale.

### 6.3 Composition

Once atomic claims have resolution trees, higher-order doctrinal positions are composed automatically per profile. The composition itself is auditable: every doctrinal statement traces back through the atoms that produced it, and any user can walk the tree from the high-level claim all the way down to the Hebrew or Greek.

### 6.4 Continuous operation

The loop never terminates. Triggers for re-running a debate include: a dependent node changing, a new atomic claim being added to the passage set, a new profile being registered, a new model generation becoming available, a red-team attack succeeding, or simple scheduled re-examination with fresh random seeds. Stability is earned by surviving repeated, diversely-seeded rounds — not by being settled once.

### 6.5 Scope discipline per iteration

In a single daily run the agent will almost never complete a full debate on a contested atomic claim. That is fine. Debates are checkpointed: each round is a commit, each agent turn is a commit, each referee ruling is a commit. A debate may take many iterations across many days to complete. That is a feature, not a bug — the commit log becomes a readable record of the argument unfolding.

## 7. Epistemic Safeguards

Without these, the system becomes theater. Each is non-negotiable and the agent enforces each on itself.

- **Context-grounded reasoning.** Agents argue from the primary sources supplied in their context window, not from their own recall of what a tradition believes. This is the single most important technique against centroid collapse. Every proponent and opponent role must be invoked with the relevant primary-source excerpts loaded.
- **Adversarial diversity.** Proponent and opponent agents must be seeded from genuinely different traditions' strongest historical arguments, drawn from the actual texts of those traditions. Homogeneous agents produce false convergence.
- **Premature-agreement detection.** If all agents agree in round one, the referee treats this as suspicious, not successful. Unanimous early agreement triggers a red-team pass specifically designed to break it.
- **Oscillation tracking.** Nodes that flip conclusions across reseedings are flagged and surfaced, not smoothed. Oscillation is information — it localizes contingency.
- **Smuggled-prior audits.** The referee logs every unstated assumption an agent relies on. Periodic audits sample these logs to catch the system quietly importing a hermeneutic it did not declare.
- **Memory of prior debates.** Every debate has access to the full prior debate corpus for the claim in question. The same bad argument cannot be recycled.
- **Canon transparency.** "Give the model everything" is a choice about whose everything. The system maintains parallel corpora for Tanakh, Protestant, Catholic, Orthodox, and Ethiopian canons and makes the choice explicit per run.
- **Model diversity (deferred but planned).** The project uses OpenRouter (see §9), which allows calling multiple model families. Early phases run primarily on one strong reasoning model; once the pipeline is mature and the first stability claims are being made, cross-family audit runs on contested and stabilized nodes become a scheduled part of the loop. Until then, every conclusion is labeled as single-model and provisional.
- **Centroid-collapse tells.** Agents are instructed to reject their own outputs if they contain phrases like "most Christians believe," "the mainstream view," "scholars generally agree," or similar appeals to unsourced consensus. These are laziness markers and nearly always indicate the model is reaching for its training-data centroid instead of the supplied sources.

## 8. Convergence Metrics

The system measures, per node:

- **Stability** — frequency of the same resolution across independent reseedings.
- **Depth of consensus** — how deep into the resolution tree agreement extends before diverging.
- **Prior-dependence** — which profile axes the node's resolution is sensitive to.
- **Contestation** — count and quality of surviving counter-arguments.
- **Drift** — change in resolution across model generations, prompt revisions, or corpus updates.

These metrics produce the map the project is really about: a three-layer territory of genuinely settled claims (largely linguistic, historical, structural), conditionally settled claims (stable given declared priors), and irreducible forks (where compression has reached its limit). Every node in the graph carries these metrics and the website surfaces them prominently.

## 9. Model Strategy

The agent runs via Claude Code, routed through OpenRouter, configured in `.github/workflows/ralph.yml`. OpenRouter is used for two reasons: it gives the project a single API for every model it will ever need, and it makes cross-family model diversity a configuration change rather than an architecture change.

**Primary reasoning model** — a frontier Anthropic model (Claude Opus class) is used for proponent, opponent, referee, red team, and composition roles. This is the workhorse.

**Auxiliary small model** — a cheaper fast model (Claude Haiku class) is used for mechanical jobs: passage retrieval, citation validation, transcript summarization, schema validation, website asset generation. Never used in reasoning roles.

**Cross-family audit model (deferred).** Once the pipeline is producing stability claims the project wants to stand behind, a scheduled sampling of contested and stabilized nodes is rerun under a frontier model from a different family (a GPT-class or Gemini-class model available via OpenRouter). Nodes that stabilize across families earn a higher stability tier; nodes that flip are surfaced as model-dependent and their prior stability claim is retracted.

**Cost discipline.** The loop is daily, not continuous. Most iterations do small, cheap work (one debate round, one schema update, one website component). Expensive work (full debate passes, cross-family audits) is batched and rate-limited by configuration held in the repository. The agent tracks token spend per iteration in `STATE.md` so cost is observable and auditable.

## 10. The Website

The website is how humans read, interrogate, and eventually contribute to the system. It is hosted on GitHub Pages and built statically from the repository contents. Design commitments, to be implemented progressively across phases:

- **The doctrine graph is the landing view**, not a homepage. Nodes are doctrines, edges are dependencies. Clicking opens a node while keeping the graph visible.
- **A profile selector lives persistently in the header.** Switching profiles re-renders the entire site against those priors. Users can pick a historical profile or define their own (client-side for as long as Pages is the host; see §11 for the migration trigger).
- **Every node has a compare mode** showing multiple profiles side by side on the same passages, with divergence points highlighted down to the specific verse or move.
- **Every node exposes its reasoning trace** as a first-class citizen — claim, passage set (originals inline, translations on hover or tab), full debate history, profile dependencies, provenance footer (model, run, commit SHA, diff from previous version).
- **Passage-centric browsing exists in parallel.** Landing on Romans 3:21–26 shows every doctrinal node that cites it, under every profile, with a heatmap of agreement and divergence on that specific text.
- **Version history is visible, not buried.** A "what changed" feed on the front page, populated from commit messages. Every node shows its history. The site can be viewed as of any past commit. Disagreements between runs are surfaced as signal.
- **The agent is shown, not hidden.** Prompts, seeds, models, and debate transcripts are accessible. Honesty is what makes the site trustworthy.

Two anti-patterns to resist at all costs: building this as an encyclopedia with a search bar (Wikipedia already exists), and hiding the machinery (turns the site into an oracle and forfeits its only legitimate authority).

## 11. Phased Roadmap

The agent should always know which phase the project is in. `STATE.md` records this explicitly.

**Phase 0 — Foundations.** Repository skeleton. Source corpora assembled (or manifested) with edition metadata. Schemas defined for atomic claims, hermeneutic profiles, debate transcripts, and resolution trees. Version control conventions established. A minimal static site that builds and deploys to Pages, even if it displays only a placeholder. *Exit criterion*: all schemas exist, the corpora are addressable at the verse level, the site deploys on every push.

**Phase 1 — Single-node proof of concept.** One famously contested atomic claim is chosen (recommended starting point: the forensic vs. transformative sense of δικαιόω in Romans 3:24). Three hermeneutic profiles are hand-authored (Reformed, Catholic, Eastern Orthodox). The full debate loop is run end-to-end on this single claim. A publishable resolution tree is produced. A minimal site page renders the claim with its profiles and traces. *Exit criterion*: one resolution tree exists, is visible on the site, and a serious reader would find it useful.

**Phase 2 — A single doctrine.** One full doctrine (natural continuation: justification) is decomposed into its atomic claims. Debates run across all of them under multiple profiles. Composition layer produces the doctrine view. The graph view, profile switcher, and compare mode are built out for this one doctrine. *Exit criterion*: a full doctrine is browsable, comparable across profiles, and every claim inside it is traceable to its atoms.

**Phase 3 — Horizontal expansion.** Extend to adjacent doctrines — ecclesiology, sacramentology, Christology, eschatology — prioritizing where profile divergence is sharpest because that is where the system produces the most novel output. Add more historical profiles. Open custom profile creation. *Exit criterion*: at least five major doctrines present with at least five profiles each.

**Phase 4 — Continuous operation and stability claims.** Transition from staged runs to the permanent background loop. Scheduled re-debating. Red-team rotations. Drift tracking across model generations. Public "what changed" feed. Subscription to nodes and profiles. Cross-family audit runs begin on stabilized nodes; first public stability claims are made. *Exit criterion*: the first nodes are marked as stable with multi-family verification and the loop is self-sustaining.

**Phase 5 — Community and critique.** Open structured channels for scholars and practitioners to challenge nodes, propose new atomic claims, and submit counter-arguments the red team must address. Human challenges become first-class inputs to the debate loop. *Exit criterion*: external contributions are flowing and the system is handling them gracefully.

**Migration triggers.** Stay on GitHub Pages as long as the site is static. Move to Cloudflare Pages + Workers (or equivalent) only when user-defined profiles need server-side re-derivation, or when user accounts / subscriptions are ready to ship. Not before.

## 12. Repository Structure (target, not prescribed)

The agent builds toward a structure something like this, but is free to deviate where it makes the work cleaner. The important thing is that the structure is principled, consistent, and documented in `STATE.md`.

```
/
├── PROJECT.md                    # this file (never modified by the agent)
├── STATE.md                      # rolling state, updated every iteration
├── README.md                     # short human-facing intro
├── .github/workflows/ralph.yml   # the runner
├── corpora/                      # source texts (or manifests pointing to them)
│   ├── hebrew/
│   ├── greek/
│   ├── translations/
│   ├── historical/               # creeds, confessions, primary works per tradition
│   └── MANIFEST.md
├── schemas/                      # JSON schemas for claims, profiles, debates, trees
├── profiles/                     # hermeneutic profiles, one file per profile, versioned
├── claims/                       # atomic claim definitions
├── debates/                      # debate transcripts, one directory per claim
├── graph/                        # composed doctrine graph data
├── site/                         # static website source
├── scripts/                      # orchestration, validation, build scripts
└── docs/                         # internal docs (architecture, decisions, conventions)
```

Debate transcripts grow fast and large. If repository size becomes a problem, migrate `debates/` to Git LFS or to a companion repo referenced by hash, and record the migration in `STATE.md`. Do not defer this indefinitely — check at every iteration whether the repo is approaching trouble.

## 13. STATE.md — the agent's working memory

`STATE.md` is the agent's shared brain across invocations. It lives at the repo root and is updated on every run. It contains:

- **Current phase** and distance to the next exit criterion.
- **Last iteration summary** — what was done, what was learned, what was committed.
- **Next suggested action** — what this iteration's agent thinks the next iteration should consider. This is advisory, not binding; the next iteration may choose differently, but it should read this first.
- **Open blockers** — concrete things blocking progress (missing corpora, schema ambiguities, failing scripts, quota exhaustion).
- **Recent token spend** — approximate, per-run, for cost observability.
- **Invariants check** — a short list of things that should always be true (e.g., "site builds", "all claim files validate against schema", "no transcripts deleted"). The agent verifies these every run and records the result.

`STATE.md` is overwritten each iteration (prior state lives in git history, which is what git is for). Keep it tight — a few hundred lines at most. Long histories belong in commit logs, not in this file.

## 14. Commit Discipline

Commits are part of the product. Follow these rules:

- **One logical change per commit where possible.** A debate round is a commit. A schema update is a commit. A website component is a commit.
- **Conventional-commit-style prefixes** for readability: `corpus:`, `schema:`, `profile(name):`, `claim(id):`, `debate(id):`, `graph:`, `site:`, `infra:`, `docs:`, `state:`.
- **Messages describe the *change*, not the file.** Bad: `update debates/romans-3-24.json`. Good: `debate(romans-3-24-dikaioō): opponent round 2, Catholic rebuttal citing Trent Sess. 6 ch. 7`.
- **Reference sources when they shape the commit.** If a debate move cites Calvin Institutes 3.11.2, say so in the message.
- **Never force-push `main`.** History is the product.

## 15. Risks and Honest Limits

- **Centroid collapse.** Largest risk. Mitigations: context-grounded reasoning, adversarial diversity, multi-tradition primary-source seeding, eventual cross-family audits, centroid-tell filters in the referee.
- **False authority.** Users may treat outputs as settled because they are machine-generated and well-cited. Mitigation: aggressive UI transparency; no conclusion is ever shown without its profile, its stability metric, and its contestation level.
- **Hermeneutical smuggling.** Agents quietly importing priors they did not declare. Mitigation: referee logging, smuggled-prior audits, periodic sampled reviews.
- **Canon politics.** Every canon choice excludes some tradition. Mitigation: maintain parallel canons, make the choice explicit per run, never pick a default silently.
- **Community reception.** Some traditions will reject the premise that their doctrine can be represented in this schema — particularly those that locate authority in living magisterium or liturgical practice rather than propositional claims. Mitigation: represent those objections themselves as nodes; accept that the system is more useful to some traditions than others and do not pretend otherwise.
- **Cost and scale.** Continuous adversarial debate is expensive at scale. Mitigations: tiered debating (cheap models for stable nodes, expensive models for contested ones), triggered re-runs rather than blind re-runs, careful caching, per-iteration spend tracking in `STATE.md`.
- **Single-model blind spots.** Running primarily on one model family means its blind spots become the project's blind spots. Mitigation: cross-family audits scheduled in Phase 4, and until then, every conclusion is explicitly labeled single-model and provisional.
- **The temptation to ship the single-point-of-truth version.** It will feel cleaner and more impressive. It is also the version two thousand years of scholarship has failed to produce, and the version that would quietly become one tradition's catechism with extra steps. Keep the comparative frame even when it is harder to market.

## 16. Success Criteria

The project succeeds if, within two years of daily iteration, it can demonstrate all of the following:

1. A doctrine graph of meaningful breadth — at least ten major doctrines, hundreds of atomic claims — with explicit profile-conditioned derivations.
2. At least one contested doctrinal disagreement localized to a precision no prior scholarship has reached — a specific verse, a specific hermeneutical move, a specific prior — in a way serious scholars from the relevant traditions acknowledge as accurate even if they reject the conclusion.
3. A working custom-profile feature that lets a user change one prior and watch the downstream graph re-derive.
4. A stability and contestation map that honestly distinguishes settled from contested territory, with oscillation and drift tracked across time and at least two model families.
5. A version history deep enough that the evolution of the system's interpretations is itself a readable, browsable artifact — the project's own thinking over time.

It fails if it produces a confident unified voice that reviewers cannot distinguish from a mainstream evangelical systematic theology, regardless of how well-cited that voice is. Watch for this on every iteration.

## 17. Bootstrapping — the very first iteration

If `STATE.md` does not exist, this is the first run. Do not attempt anything ambitious. The first iteration's only job is to establish the ground:

1. Create `README.md` with a brief human-facing description of the project (one or two paragraphs) and a link to this file.
2. Create `STATE.md` with the structure described in §13, marking the current phase as Phase 0 and listing the Phase 0 exit criteria as open blockers.
3. Create an empty but sensible top-level directory skeleton per §12 (empty directories can hold a `.gitkeep`).
4. Create a `docs/decisions/` directory with a first architectural decision record stating "we are using the Ralph method driven by PROJECT.md, OpenRouter for models, GitHub Pages for hosting, and progressive emergence for everything else."
5. Commit each of these as separate logical commits with clear messages.
6. Update `STATE.md` with a concrete recommendation for iteration 2 (likely: begin schema design for atomic claims).
7. Commit `STATE.md`, push, exit.

That is a complete and valuable first run. Do not try to do more.

## 18. Closing Note

The ambition of this project is not to end theological disagreement. It is to give disagreement, for the first time, the precise shared map it has never had — a map where every point of difference is localized, every prior is declared, every argument is preserved, and the whole thing keeps running, keeps being challenged, and keeps getting better as long as there is compute to run it on. That is something two thousand years of serious scholarship could not build, not because it lacked insight, but because it could not rerun the argument ten thousand times with perfect memory. We can.

Every iteration matters. Make today's count. Then exit and let tomorrow's iteration build on it.
