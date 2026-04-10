(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     SECTION 1: UTILITIES
     ═══════════════════════════════════════════ */

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'onclick') node.addEventListener('click', attrs[k]);
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      var arr = Array.isArray(children) ? children : [children];
      for (var i = 0; i < arr.length; i++) {
        var ch = arr[i];
        if (typeof ch === 'string') node.appendChild(document.createTextNode(ch));
        else if (ch) node.appendChild(ch);
      }
    }
    return node;
  }

  function text(s) { return document.createTextNode(s); }

  /* Humanize any ID: "reformed-westminster" → "Reformed Westminster",
     "supports_claim" → "Supports Claim", "red_team" → "Red Team".
     Works for profiles, outcomes, roles, axes — anything. */
  function humanize(id) {
    if (!id) return '';
    return id
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /* Profile label: use the name from the manifest if loaded, else humanize the ID */
  function profileLabel(id) {
    if (State.manifest && State.manifest.profiles) {
      var match = State.manifest.profiles.find(function (p) { return p.id === id; });
      if (match && match.name) return match.name;
    }
    /* Short fallback: strip common suffixes for compactness */
    return humanize(id.replace(/-westminster|-tridentine|-chalcedonian|-augsburg/g, ''));
  }

  function outcomeLabel(o) {
    /* Strip the _claim suffix for cleaner display */
    return humanize((o || '').replace(/_claim$/, ''));
  }
  function shortModel(m) { return m ? m.replace(/^[^/]+\//, '') : ''; }
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toISOString().slice(0, 10);
  }
  function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '...' : s || ''; }

  /* ═══════════════════════════════════════════
     SECTION 2: STATE
     ═══════════════════════════════════════════ */

  var State = {
    manifest: null,
    claims: {},
    trees: {},
    debates: {},
    profiles: {},
    runsIndex: null,
    bundleLoaded: false,
    lens: '',
    searchIndex: null,
  };

  /* ═══════════════════════════════════════════
     SECTION 3: DATA LAYER
     ═══════════════════════════════════════════ */

  function loadJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + path + ': ' + res.status);
      return res.json();
    });
  }

  /* Load everything from the generated bundle (one HTTP request for all data) */
  function loadBundle() {
    if (State.bundleLoaded) return Promise.resolve();
    return loadJson('./data/bundle.json').then(function (bundle) {
      State.manifest = bundle.manifest;
      State.claims = bundle.claims || {};
      State.trees = bundle.trees || {};
      State.debates = bundle.debates || {};
      State.profiles = bundle.profiles || {};
      State.bundleLoaded = true;
    });
  }

  /* Backward-compatible accessors — all resolve from the already-loaded bundle */
  function loadClaim(id) {
    return Promise.resolve(State.claims[id] || null);
  }
  function loadTree(id) {
    return Promise.resolve(State.trees[id] || null);
  }
  function loadDebate(id) {
    return Promise.resolve(State.debates[id] || null);
  }
  function loadProfile(id) {
    return Promise.resolve(State.profiles[id] || null);
  }

  function loadRunsIndex() {
    if (State.runsIndex) return Promise.resolve(State.runsIndex);
    return loadJson('./data/runs/index.json').then(function (d) {
      State.runsIndex = d.sort(function (a, b) {
        return b.timestamp.localeCompare(a.timestamp);
      });
      return State.runsIndex;
    });
  }

  /* helper to find manifest entry for a claim */
  function findManifestClaim(claimId) {
    if (!State.manifest) return null;
    for (var i = 0; i < State.manifest.doctrines.length; i++) {
      var doc = State.manifest.doctrines[i];
      for (var j = 0; j < doc.claims.length; j++) {
        if (doc.claims[j].id === claimId) return doc.claims[j];
      }
    }
    return null;
  }

  /* all claims flat */
  function allManifestClaims() {
    if (!State.manifest) return [];
    var out = [];
    State.manifest.doctrines.forEach(function (d) {
      d.claims.forEach(function (c) { out.push(c); });
    });
    return out;
  }

  /* ═══════════════════════════════════════════
     SECTION 4: COMPONENTS
     ═══════════════════════════════════════════ */

  /* ── Profile Pill ─────────────────────── */
  function profilePill(profileId, outcome) {
    return el('span', { class: 'pill pill--' + outcome }, [
      el('span', { class: 'pill-name' }, profileLabel(profileId)),
      text(' '),
      el('span', {}, outcomeLabel(outcome)),
    ]);
  }

  function pillsRow(outcomes, extraClass) {
    var div = el('div', { class: 'pills' + (extraClass ? ' ' + extraClass : '') });
    (outcomes || []).forEach(function (o) {
      div.appendChild(profilePill(o.profileId || o.profile_id, o.outcome));
    });
    return div;
  }

  /* ── Metric Bar ───────────────────────── */
  function metricBar(label, value, type) {
    var pct = Math.round((value || 0) * 100);
    return el('div', { class: 'metric-bar' }, [
      el('span', { class: 'metric-label' }, label),
      el('div', { class: 'metric-track' }, [
        el('div', { class: 'metric-fill metric-fill--' + type, style: 'width:' + pct + '%' }),
      ]),
      el('span', { class: 'metric-value' }, pct + '%'),
    ]);
  }

  /* ── Claim Card ───────────────────────── */
  function claimCard(mc) {
    var card = el('a', { class: 'claim-card', href: '#/claim/' + mc.id });
    var header = el('div', { class: 'claim-card-header' }, [
      el('span', { class: 'status-dot status-dot--' + mc.status }),
      el('h3', { class: 'claim-card-title' }, mc.humanTitle),
    ]);
    card.appendChild(header);
    card.appendChild(el('p', { class: 'claim-card-statement' }, truncate(mc.statement, 140)));
    if (mc.profileOutcomes && mc.profileOutcomes.length) {
      card.appendChild(pillsRow(mc.profileOutcomes));
    }
    if (mc.metrics) {
      var metrics = el('div', { class: 'claim-card-metrics' });
      metrics.appendChild(metricBar('Stability', mc.metrics.stability, 'stability'));
      metrics.appendChild(metricBar('Contestation', mc.metrics.contestation, 'contestation'));
      card.appendChild(metrics);
    }
    return card;
  }

  /* ── Tree Node (recursive) ────────────── */
  function treeNode(node) {
    var type = node.node_type || 'unresolved';
    var box = el('div', { class: 'tree-node tree-node--' + type });

    /* bar: dot + badge + status */
    var bar = el('div', { class: 'tree-node-bar' }, [
      el('span', { class: 'tree-dot tree-dot--' + type }),
      el('span', { class: 'tree-badge tree-badge--' + type }, (type.charAt(0).toUpperCase() + type.slice(1))),
      el('span', { class: 'tree-status' }, '[' + (node.status || '') + ']'),
    ]);
    box.appendChild(bar);

    /* summary */
    box.appendChild(el('p', { class: 'tree-node-summary' }, node.summary || ''));

    /* profile scope pills (neutral style — these show which profiles are in scope, not outcomes) */
    if (node.profiles_in_scope && node.profiles_in_scope.length) {
      var pills = el('div', { class: 'pills' });
      node.profiles_in_scope.forEach(function (pid) {
        pills.appendChild(el('span', { class: 'pill pill--scope' }, [
          el('span', { class: 'pill-name' }, profileLabel(pid)),
        ]));
      });
      box.appendChild(pills);
    }

    /* divergence point (highlighted) */
    if (node.divergence_point && node.divergence_point.kind) {
      var dp = node.divergence_point;
      var divBox = el('div', { class: 'tree-divergence' }, [
        el('div', { class: 'tree-divergence-icon' }, '\u26A1'),
        el('div', {}, [
          el('strong', {}, dp.label || ''),
          text(' '),
          el('span', { class: 'tree-divergence-kind' }, '(' + (dp.kind || '') + ')'),
          dp.description ? el('p', {}, dp.description) : null,
        ]),
      ]);
      box.appendChild(divBox);
    }

    /* depends on (compact) */
    if (node.depends_on && node.depends_on.type) {
      var refs = (node.depends_on.references || []).join(', ');
      box.appendChild(el('div', { class: 'tree-depends' }, [
        text('Depends on: '),
        el('code', {}, node.depends_on.type),
        refs ? text(' \u2014 ' + refs) : null,
      ]));
    }

    /* evidence (collapsed) */
    if (node.supporting_evidence && node.supporting_evidence.length) {
      box.appendChild(evidenceDetails('Supporting evidence', node.supporting_evidence, false));
    }
    if (node.counter_evidence && node.counter_evidence.length) {
      box.appendChild(evidenceDetails('Counter evidence', node.counter_evidence, true));
    }

    /* notes */
    if (node.notes) {
      box.appendChild(el('div', { class: 'tree-notes' }, node.notes));
    }

    /* children (recursive) */
    if (node.children && node.children.length) {
      var childBox = el('div', { class: 'tree-children' });
      node.children.forEach(function (child) {
        childBox.appendChild(treeNode(child));
      });
      box.appendChild(childBox);
    }

    return box;
  }

  function evidenceDetails(title, items, isCounter) {
    var details = el('details', { class: isCounter ? 'tree-counter-section' : 'tree-evidence-section' });
    details.appendChild(el('summary', {}, title + ' (' + items.length + ')'));
    var ul = el('ul', { class: 'tree-evidence-list' });
    items.forEach(function (ev) {
      var li = el('li');
      var line = (ev.source_type || 'unknown') + ': ';
      li.appendChild(text(line));
      li.appendChild(el('code', {}, ev.reference || '(no ref)'));
      if (ev.weight) li.appendChild(text(' [' + ev.weight + ']'));
      if (ev.text_quoted) {
        li.appendChild(el('blockquote', { class: isCounter ? 'counter-quote' : 'evidence-quote' }, ev.text_quoted));
      }
      ul.appendChild(li);
    });
    details.appendChild(ul);
    return details;
  }

  /* ── Full Tree Viz ────────────────────── */
  function treeViz(tree, container) {
    if (!tree || !tree.root) {
      container.appendChild(el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, '\u23F3'),
        el('p', {}, 'Resolution tree not yet available. Debate in progress.'),
      ]));
      return;
    }

    /* summary */
    container.appendChild(el('div', { class: 'tree-summary' }, tree.resolution_summary || ''));

    /* metrics */
    if (tree.metrics) {
      var m = tree.metrics;
      var mp = el('div', { class: 'tree-metrics-panel' });
      mp.appendChild(metricBar('Stability', m.stability_score, 'stability'));
      mp.appendChild(metricBar('Contestation', m.contestation_score, 'contestation'));
      mp.appendChild(metricBar('Consensus', m.depth_of_consensus, 'consensus'));
      container.appendChild(mp);

      if (m.prior_dependence && m.prior_dependence.length) {
        container.appendChild(el('div', { class: 'tree-depends' }, [
          text('Key prior dependencies: '),
          el('code', {}, m.prior_dependence.join(', ')),
        ]));
      }
    }

    /* tree structure */
    container.appendChild(treeNode(tree.root));

    /* profile outcomes */
    if (tree.profile_outcomes && tree.profile_outcomes.length) {
      var outSection = el('div', { class: 'tree-profile-outcomes' });
      outSection.appendChild(el('h3', { class: 'section-title', style: 'font-size:var(--text-lg)' }, 'Profile Outcomes'));
      tree.profile_outcomes.forEach(function (o) {
        var card = el('div', { class: 'profile-outcome-card' });
        card.appendChild(el('div', { class: 'outcome-header' }, [
          el('strong', {}, profileLabel(o.profile_id)),
          profilePill(o.profile_id, o.outcome),
        ]));
        card.appendChild(el('p', { class: 'outcome-rationale' }, o.rationale_summary || ''));
        outSection.appendChild(card);
      });
      container.appendChild(outSection);
    }
  }

  /* ── Debate Transcript ────────────────── */
  function debateTranscript(debate, container) {
    if (!debate || !debate.rounds || !debate.rounds.length) {
      container.appendChild(el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, '\u23F3'),
        el('p', {}, 'Debate not yet started for this claim.'),
      ]));
      return;
    }

    /* meta */
    var meta = el('div', { class: 'debate-meta' }, [
      el('span', {}, 'Participants: ' + (debate.participants || []).map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(', ')),
      el('span', {}, debate.rounds.length + ' round' + (debate.rounds.length !== 1 ? 's' : '')),
    ]);
    container.appendChild(meta);

    /* rounds */
    debate.rounds.forEach(function (round, ri) {
      var details = el('details', { class: 'debate-round' });
      if (ri === 0) details.setAttribute('open', '');
      details.appendChild(el('summary', {}, 'Round ' + (round.round_number || ri + 1)));

      var movesDiv = el('div', { class: 'debate-moves' });
      (round.moves || []).forEach(function (move) {
        var role = move.agent_role || 'unknown';
        var moveBox = el('div', { class: 'debate-move debate-move--' + role });

        var header = el('div', { class: 'debate-move-header' }, [
          el('span', { class: 'debate-role-badge debate-role--' + role }, ROLE_LABELS[role] || role),
          move.profile_id ? el('span', { class: 'debate-profile' }, profileLabel(move.profile_id)) : null,
          move.intent ? el('span', { class: 'debate-intent' }, move.intent) : null,
          move.author_model ? el('span', { class: 'debate-model' }, shortModel(move.author_model)) : null,
        ]);
        moveBox.appendChild(header);
        moveBox.appendChild(el('div', { class: 'debate-move-content' }, move.content || ''));

        if (move.citations && move.citations.length) {
          var cBox = el('div', { class: 'debate-citations' });
          cBox.appendChild(text('Citations:'));
          var ul = el('ul');
          move.citations.forEach(function (ci) {
            var li = el('li');
            li.appendChild(text((ci.source_type || 'unknown') + ': '));
            li.appendChild(el('code', {}, ci.reference || '(no ref)'));
            if (ci.text_quoted) li.appendChild(text(' \u2014 "' + truncate(ci.text_quoted, 100) + '"'));
            ul.appendChild(li);
          });
          cBox.appendChild(ul);
          moveBox.appendChild(cBox);
        }

        movesDiv.appendChild(moveBox);
      });
      details.appendChild(movesDiv);
      container.appendChild(details);
    });
  }

  /* ── Passages ─────────────────────────── */
  function renderPassages(passages, container) {
    if (!passages || !passages.length) return;
    passages.forEach(function (p) {
      var card = el('div', { class: 'passage-card' });
      var ref = p.reference || p.ref || '';
      var lang = p.original_language || p.language || '';
      card.appendChild(el('div', { class: 'passage-ref' }, [
        text(ref + ' '),
        el('span', { class: 'lang' }, lang ? '(' + lang + ')' : ''),
      ]));

      var origText = p.original_text || p.text || '';
      if (origText) {
        card.appendChild(el('pre', { class: 'passage-original' }, origText));
      }

      var translations = p.translations || {};
      var keys = Object.keys(translations);
      keys.forEach(function (tk) {
        card.appendChild(el('div', { class: 'passage-translation' }, [
          el('span', { class: 't-label' }, tk),
          text(' ' + translations[tk]),
        ]));
      });

      container.appendChild(card);
    });
  }

  /* ═══════════════════════════════════════════
     SECTION 5: VIEWS
     ═══════════════════════════════════════════ */

  /* ── Landing ──────────────────────────── */
  function viewLanding(main) {
    /* Hero */
    var hero = el('div', { class: 'hero' });
    hero.appendChild(el('h1', { class: 'hero-title' }, 'Mapping where Christian traditions agree and disagree'));
    hero.appendChild(el('p', { class: 'hero-subtitle' }, 'An autonomous AI research system that runs structured adversarial debates between Reformed, Catholic, and Orthodox theological positions. Not to settle which tradition is right, but to build the first precise, auditable map of why they disagree.'));

    /* live pills from first claim with outcomes */
    var claims = allManifestClaims();
    var firstWithOutcomes = claims.find(function (c) { return c.profileOutcomes && c.profileOutcomes.length; });
    if (firstWithOutcomes) {
      hero.appendChild(pillsRow(firstWithOutcomes.profileOutcomes, 'hero-pills'));
    }

    hero.appendChild(el('div', { class: 'hero-cta' }, [
      el('a', { class: 'btn btn--primary', href: '#/explore' }, 'Explore the claims'),
      el('a', { class: 'btn btn--secondary', href: '#/how-it-works' }, 'How it works'),
    ]));
    main.appendChild(hero);

    /* How it works teaser */
    main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:32px' }, 'How it works'));
    main.appendChild(el('p', { class: 'section-intro' }, 'The system defines narrow theological claims from scripture, then runs adversarial debates between traditions \u2014 each seeded with their strongest primary sources. A red team attacks premature consensus. Resolution trees map exactly where agreement holds and where it breaks, identifying the precise hermeneutical assumption behind each fork.'));
    main.appendChild(el('p', {}, [el('a', { href: '#/how-it-works' }, 'Read the full pipeline \u2192')]));

    /* Claim cards */
    main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:32px' }, 'Current claims'));
    var grid = el('div', { class: 'claim-cards' });
    var filtered = filterByLens(claims);
    filtered.forEach(function (mc) { grid.appendChild(claimCard(mc)); });
    main.appendChild(grid);
  }

  /* ── How It Works ─────────────────────── */
  function viewHowItWorks(main) {
    main.appendChild(el('h1', { class: 'section-title' }, 'How It Works'));
    main.appendChild(el('p', { class: 'section-intro' }, 'The system advances autonomously, one step per iteration, running twice daily across multiple AI model families.'));

    var steps = [
      { n: '1', title: 'A claim is defined', desc: 'A narrow theological question is extracted from scripture. Not "what is justification?" but "does the Greek verb \u03B4\u03B9\u03BA\u03B1\u03B9\u03CC\u03C9 in Romans 3:24 carry a forensic or transformative sense?"' },
      { n: '2', title: 'Three traditions debate it', desc: 'Reformed, Catholic, and Orthodox advocates each argue the claim, seeded with their strongest primary sources \u2014 Calvin\u2019s Institutes, the Council of Trent, the Church Fathers. Each operates under explicitly declared interpretive priors.' },
      { n: '3', title: 'A red team attacks consensus', desc: 'An adversarial referee challenges premature agreement. If all three traditions agree in round one, the red team probes whether the agreement is genuine or whether the AI collapsed toward a comfortable center.' },
      { n: '4', title: 'A resolution tree maps the fork', desc: 'The system produces a structured tree showing exactly where agreement holds and where it breaks. The root node captures shared ground. Branches localize the precise point of divergence.' },
      { n: '5', title: 'The blocking prior is identified', desc: 'At each fork, the system identifies which hermeneutical assumption causes the split \u2014 is it a different authority model? A different method of reading Paul against James? A different canon? The prior is named, not hidden.' },
      { n: '6', title: 'This runs autonomously', desc: 'Every day, the system advances by one step. It rotates across model providers (Anthropic, OpenAI, Google, Qwen, DeepSeek, xAI) so no single model\u2019s biases dominate. Everything is version-controlled and transparent.' },
    ];

    var grid = el('div', { class: 'pipeline' });
    steps.forEach(function (s) {
      var card = el('div', { class: 'pipeline-step' });
      card.appendChild(el('div', { class: 'pipeline-step-number' }, s.n));
      card.appendChild(el('h3', {}, s.title));
      card.appendChild(el('p', {}, s.desc));
      grid.appendChild(card);
    });
    main.appendChild(grid);

    /* Anti-collapse safeguards */
    main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:32px' }, 'Anti-collapse safeguards'));
    var safeguards = el('div', { class: 'panel' });
    safeguards.appendChild(el('p', {}, 'The biggest risk in AI-generated theological analysis is centroid collapse \u2014 the tendency to converge on a comfortable middle position that no actual tradition holds. The system defends against this with:'));
    var ul = el('ul');
    ['Context-grounded reasoning \u2014 agents argue from supplied primary sources, not training data recall',
      'Adversarial diversity \u2014 proponent and opponent seeded from genuinely different traditions\u2019 strongest historical arguments',
      'Premature-agreement detection \u2014 unanimous Round 1 agreement triggers mandatory red-team attack',
      'Smuggled-prior audits \u2014 referee logs every unstated assumption',
      'Centroid-collapse tells \u2014 agents reject outputs containing "most scholars agree" or "mainstream view"',
      'Model rotation across providers \u2014 no single model family dominates',
    ].forEach(function (t) { ul.appendChild(el('li', {}, t)); });
    safeguards.appendChild(ul);
    main.appendChild(safeguards);
  }

  /* ── Explore ──────────────────────────── */
  function viewExplore(main) {
    main.appendChild(el('h1', { class: 'section-title' }, 'Explore Claims'));
    var claims = filterByLens(allManifestClaims());
    main.appendChild(el('p', { class: 'section-intro' }, claims.length + ' atomic claim' + (claims.length !== 1 ? 's' : '') + ' across ' + State.manifest.doctrines.length + ' doctrine' + (State.manifest.doctrines.length !== 1 ? 's' : '') + '.'));
    var grid = el('div', { class: 'claim-cards' });
    claims.forEach(function (mc) { grid.appendChild(claimCard(mc)); });
    main.appendChild(grid);
  }

  /* ── Claim Detail ─────────────────────── */
  function viewClaimDetail(main, params) {
    var claimId = params.id;
    var mc = findManifestClaim(claimId);

    if (!mc) {
      main.appendChild(el('div', { class: 'empty-state' }, [
        el('p', {}, 'Claim not found: ' + claimId),
      ]));
      return;
    }

    /* breadcrumb */
    main.appendChild(el('p', { class: 'tree-depends' }, [
      el('a', { href: '#/explore' }, 'Claims'),
      text(' / '),
      text(mc.humanTitle),
    ]));

    /* title */
    main.appendChild(el('h1', { class: 'section-title' }, mc.humanTitle));

    /* profile outcomes bar */
    if (mc.profileOutcomes && mc.profileOutcomes.length) {
      main.appendChild(el('div', { class: 'outcomes-bar' }, mc.profileOutcomes.map(function (o) {
        return profilePill(o.profileId, o.outcome);
      })));
    }

    /* claim statement */
    main.appendChild(el('div', { class: 'claim-statement' }, mc.statement));

    /* metrics */
    if (mc.metrics) {
      var mp = el('div', { class: 'tree-metrics-panel', style: 'margin:16px 0' });
      mp.appendChild(metricBar('Stability', mc.metrics.stability, 'stability'));
      mp.appendChild(metricBar('Contestation', mc.metrics.contestation, 'contestation'));
      mp.appendChild(metricBar('Consensus', mc.metrics.consensus, 'consensus'));
      main.appendChild(mp);
    }

    /* loading indicator */
    var loading = el('p', { class: 'tree-depends' }, 'Loading data...');
    main.appendChild(loading);

    /* load data */
    var treeId = mc.treeId;
    Promise.all([
      loadClaim(claimId),
      mc.hasTree && treeId ? loadTree(treeId) : Promise.resolve(null),
      mc.hasDebate ? loadDebate(claimId) : Promise.resolve(null),
    ]).then(function (results) {
      var claim = results[0];
      var tree = results[1];
      var debate = results[2];

      loading.remove();

      /* passages (collapsible) */
      var passages = claim.passages;
      if (passages && passages.length) {
        var pDetails = el('details', { class: 'section-details' });
        pDetails.appendChild(el('summary', {}, 'Source passages (' + passages.length + ')'));
        var pContent = el('div', { class: 'details-content' });
        renderPassages(passages, pContent);
        pDetails.appendChild(pContent);
        main.appendChild(pDetails);
      }

      /* resolution tree */
      main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:24px' }, 'Resolution Tree'));
      var treeContainer = el('div');
      treeViz(tree, treeContainer);
      main.appendChild(treeContainer);

      /* debate (collapsible) */
      var debateSection = el('details', { class: 'section-details', style: 'margin-top:24px' });
      debateSection.appendChild(el('summary', {}, 'Debate Transcript'));
      var debateContent = el('div', { class: 'details-content' });
      debateTranscript(debate, debateContent);
      debateSection.appendChild(debateContent);
      main.appendChild(debateSection);

      /* version history */
      var vh = claim.version_history;
      if (vh && vh.length) {
        main.appendChild(el('h3', { class: 'section-title', style: 'margin-top:24px;font-size:var(--text-lg)' }, 'Version History'));
        var table = el('table', { class: 'version-table' });
        table.appendChild(el('thead', {}, [el('tr', {}, [
          el('th', {}, 'Date'), el('th', {}, 'Model'), el('th', {}, 'Note'),
        ])]));
        var tbody = el('tbody');
        vh.forEach(function (v) {
          tbody.appendChild(el('tr', {}, [
            el('td', {}, formatDate(v.timestamp)),
            el('td', { html: '<code>' + escapeHtml(shortModel(v.author_model)) + '</code>' }),
            el('td', {}, v.note || ''),
          ]));
        });
        table.appendChild(tbody);
        main.appendChild(table);
      }
    }).catch(function (err) {
      loading.textContent = 'Error loading data: ' + err.message;
    });
  }

  /* ── Profile Detail ───────────────────── */
  function viewProfileDetail(main, params) {
    var pid = params.id;
    main.appendChild(el('p', { class: 'tree-depends' }, [
      el('a', { href: '#/' }, 'Home'),
      text(' / Profiles / '),
      text(profileLabel(pid)),
    ]));

    var loading = el('p', { class: 'tree-depends' }, 'Loading profile...');
    main.appendChild(loading);

    loadProfile(pid).then(function (profile) {
      loading.remove();

      /* header */
      var header = el('div', { class: 'profile-header' });
      header.appendChild(el('h1', {}, profile.name || profileLabel(pid)));
      header.appendChild(el('div', { class: 'tradition-label' }, profile.tradition || ''));
      if (profile.description) {
        header.appendChild(el('p', { style: 'margin-top:8px;color:var(--text-secondary);font-size:var(--text-sm)' }, truncate(profile.description, 300)));
      }
      main.appendChild(header);

      /* axes */
      main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:24px' }, 'Hermeneutical Axes'));
      var grid = el('div', { class: 'axes-grid' });

      /* Dynamically discover axes: any key in the profile that is an object
         with a 'position', 'notes', 'tradition', or 'primary' field */
      var skipKeys = { id:1, name:1, tradition:1, description:1, version_history:1 };
      var axisKeys = Object.keys(profile).filter(function (k) {
        if (skipKeys[k]) return false;
        var v = profile[k];
        return v && typeof v === 'object' && !Array.isArray(v);
      });

      axisKeys.forEach(function (axisKey) {
        var axis = profile[axisKey];
        if (!axis) return;
        var card = el('div', { class: 'axis-card' });
        card.appendChild(el('h3', {}, humanize(axisKey)));

        /* position */
        var position = axis.position || axis.tradition || axis.primary || axis.general_principle || '';
        if (position) {
          card.appendChild(el('div', { class: 'axis-position' }, String(position).replace(/-/g, ' ')));
        }

        /* notes (scrollable) */
        if (axis.notes) {
          card.appendChild(el('div', { class: 'axis-notes' }, truncate(axis.notes, 500)));
        }

        grid.appendChild(card);
      });
      main.appendChild(grid);

      /* claims involving this profile */
      var relevantClaims = allManifestClaims().filter(function (c) {
        return (c.profileOutcomes || []).some(function (o) { return o.profileId === pid; });
      });
      if (relevantClaims.length) {
        main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:32px' }, 'Claims Involving This Profile'));
        var claimGrid = el('div', { class: 'claim-cards' });
        relevantClaims.forEach(function (mc) { claimGrid.appendChild(claimCard(mc)); });
        main.appendChild(claimGrid);
      }
    }).catch(function (err) {
      loading.textContent = 'Error loading profile: ' + err.message;
    });
  }

  /* ── Transparency ─────────────────────── */
  function viewTransparency(main) {
    main.appendChild(el('h1', { class: 'section-title' }, 'Transparency'));
    main.appendChild(el('p', { class: 'section-intro' }, 'Every output is tagged with the model, run, and commit that produced it. Nothing is hidden.'));

    var sys = State.manifest.system || {};
    var loading = el('p', { class: 'tree-depends' }, 'Loading run data...');
    main.appendChild(loading);

    loadRunsIndex().then(function (runs) {
      loading.remove();

      /* derive stats from runs */
      var totalRuns = runs.length;
      var lastRun = runs.length ? runs[0] : null;
      var productiveRuns = runs.filter(function (r) { return r.filesChanged > 0; }).length;

      /* derive unique models with counts, grouped by provider */
      var modelCounts = {};
      var providerModels = {};
      runs.forEach(function (r) {
        if (!r.model) return;
        modelCounts[r.model] = (modelCounts[r.model] || 0) + 1;
        var provider = r.model.split('/')[0];
        if (!providerModels[provider]) providerModels[provider] = {};
        providerModels[provider][r.model] = (providerModels[provider][r.model] || 0) + 1;
      });
      var uniqueModels = Object.keys(modelCounts).sort();
      var providers = Object.keys(providerModels).sort();

      var grid = el('div', { class: 'transparency-grid' });

      /* stats card */
      var statsCard = el('div', { class: 'transparency-card' });
      statsCard.appendChild(el('h3', {}, 'System Stats'));
      statsCard.appendChild(el('div', { class: 'stat-number' }, String(totalRuns)));
      statsCard.appendChild(el('p', { style: 'color:var(--text-secondary);font-size:var(--text-xs);margin:0' }, 'autonomous iterations completed'));
      statsCard.appendChild(el('p', { style: 'color:var(--text-secondary);font-size:var(--text-xs);margin:4px 0 0' }, productiveRuns + ' productive runs (' + Math.round(productiveRuns / totalRuns * 100) + '% commit rate)'));
      if (lastRun) {
        statsCard.appendChild(el('p', { style: 'color:var(--text-dim);font-size:var(--text-xs);margin:4px 0 0' }, 'Last run: ' + formatDate(lastRun.timestamp)));
      }
      statsCard.appendChild(el('p', { style: 'color:var(--text-dim);font-size:var(--text-xs);margin:4px 0 0' }, uniqueModels.length + ' unique models from ' + providers.length + ' providers'));
      grid.appendChild(statsCard);

      /* source code card */
      var sourceCard = el('div', { class: 'transparency-card' });
      sourceCard.appendChild(el('h3', {}, 'Open Source'));
      sourceCard.appendChild(el('p', { style: 'color:var(--text-secondary);font-size:var(--text-xs)' }, 'The entire project \u2014 schemas, debate transcripts, resolution trees, prompts, and the agent runner \u2014 is open source. Every artifact is diffable and reproducible from the repository alone.'));
      if (sys.repoUrl) {
        sourceCard.appendChild(el('a', { href: sys.repoUrl, target: '_blank', rel: 'noopener' }, 'View on GitHub \u2192'));
      }
      grid.appendChild(sourceCard);

      /* safeguards card */
      var safeCard = el('div', { class: 'transparency-card' });
      safeCard.appendChild(el('h3', {}, 'Anti-Collapse Safeguards'));
      safeCard.appendChild(el('p', { style: 'color:var(--text-secondary);font-size:var(--text-xs)' }, 'Red team challenges premature consensus. Models rotate across providers. Stability scores track whether positions survive re-debating. Phrases like "most scholars agree" trigger automatic rejection.'));
      grid.appendChild(safeCard);

      main.appendChild(grid);

      /* full model roster — grouped by provider */
      main.appendChild(el('h2', { class: 'section-title', style: 'margin-top:32px' }, 'All Models'));
      main.appendChild(el('p', { class: 'section-intro' }, 'Every model that has ever participated in Opus Rationalis, grouped by provider. Run counts reflect total iterations, not just productive commits.'));

      var modelsGrid = el('div', { class: 'transparency-grid' });
      providers.forEach(function (provider) {
        var card = el('div', { class: 'transparency-card' });
        card.appendChild(el('h3', { style: 'text-transform:capitalize' }, provider));
        var models = providerModels[provider];
        var sortedModels = Object.keys(models).sort(function (a, b) { return models[b] - models[a]; });
        var ul = el('ul', { class: 'model-list' });
        sortedModels.forEach(function (m) {
          var li = el('li');
          li.appendChild(el('span', {}, shortModel(m)));
          li.appendChild(text(' '));
          li.appendChild(el('span', { style: 'color:var(--text-dim)' }, '\u00D7' + models[m]));
          ul.appendChild(li);
        });
        card.appendChild(ul);
        modelsGrid.appendChild(card);
      });
      main.appendChild(modelsGrid);
    });
  }

  /* ── Activity Feed (paginated, from runs) ─ */
  var ACTIVITY_PAGE_SIZE = 15;

  function viewActivity(main, params) {
    var page = parseInt((params && params.page) || '1', 10) || 1;

    main.appendChild(el('h1', { class: 'section-title' }, 'Activity Log'));
    main.appendChild(el('p', { class: 'section-intro' }, 'Every autonomous iteration, sourced directly from the run logs. This is a living system.'));

    var loading = el('p', { class: 'tree-depends' }, 'Loading runs...');
    main.appendChild(loading);

    loadRunsIndex().then(function (runs) {
      loading.remove();

      var totalPages = Math.ceil(runs.length / ACTIVITY_PAGE_SIZE);
      if (page > totalPages) page = totalPages;
      if (page < 1) page = 1;
      var start = (page - 1) * ACTIVITY_PAGE_SIZE;
      var pageRuns = runs.slice(start, start + ACTIVITY_PAGE_SIZE);

      /* summary bar */
      var summary = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:var(--text-xs);color:var(--text-secondary)' });
      summary.appendChild(el('span', {}, runs.length + ' total runs \u2022 Page ' + page + ' of ' + totalPages));
      main.appendChild(summary);

      /* run list */
      var feed = el('div', { class: 'activity-feed' });
      pageRuns.forEach(function (run) {
        var productive = run.filesChanged > 0;
        var row = el('div', { class: 'activity-item' + (productive ? '' : ' activity-item--noop') });
        row.appendChild(el('div', {}, [
          el('div', { class: 'activity-date' }, formatDate(run.timestamp)),
          el('div', { class: 'activity-type' }, productive ? run.filesChanged + ' file' + (run.filesChanged !== 1 ? 's' : '') : 'no-op'),
        ]));
        row.appendChild(el('div', {}, [
          el('div', { class: 'activity-model' }, run.model || 'unknown'),
          run.toolCalls > 0 ? el('div', { style: 'font-size:var(--text-xs);color:var(--text-dim)' }, run.toolCalls + ' tool calls') : null,
        ]));
        feed.appendChild(row);
      });
      main.appendChild(feed);

      /* pagination controls */
      if (totalPages > 1) {
        var nav = el('div', { style: 'display:flex;gap:8px;justify-content:center;margin-top:20px' });
        if (page > 1) {
          nav.appendChild(el('a', { class: 'btn btn--secondary', href: '#/activity/' + (page - 1), style: 'font-size:var(--text-xs);padding:4px 14px' }, '\u2190 Previous'));
        }
        for (var i = 1; i <= totalPages; i++) {
          var pgBtn = el('a', {
            class: 'btn ' + (i === page ? 'btn--primary' : 'btn--secondary'),
            href: '#/activity/' + i,
            style: 'font-size:var(--text-xs);padding:4px 10px;min-width:32px;text-align:center'
          }, String(i));
          nav.appendChild(pgBtn);
        }
        if (page < totalPages) {
          nav.appendChild(el('a', { class: 'btn btn--secondary', href: '#/activity/' + (page + 1), style: 'font-size:var(--text-xs);padding:4px 14px' }, 'Next \u2192'));
        }
        main.appendChild(nav);
      }
    });
  }

  /* ── Not Found ────────────────────────── */
  function viewNotFound(main) {
    main.appendChild(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, '?'),
      el('p', {}, 'Page not found.'),
      el('p', {}, [el('a', { href: '#/' }, 'Go home')]),
    ]));
  }

  /* ═══════════════════════════════════════════
     SECTION 6: ROUTER
     ═══════════════════════════════════════════ */

  var ROUTES = [
    { pattern: /^#?\/?$/, view: viewLanding },
    { pattern: /^#\/how-it-works$/, view: viewHowItWorks },
    { pattern: /^#\/explore$/, view: viewExplore },
    { pattern: /^#\/claim\/(.+)$/, view: viewClaimDetail, param: 'id' },
    { pattern: /^#\/profile\/(.+)$/, view: viewProfileDetail, param: 'id' },
    { pattern: /^#\/transparency$/, view: viewTransparency },
    { pattern: /^#\/activity\/(\d+)$/, view: viewActivity, param: 'page' },
    { pattern: /^#\/activity$/, view: viewActivity },
  ];

  function navigate() {
    var hash = location.hash || '#/';
    var main = document.getElementById('main-content');
    main.innerHTML = '';

    for (var i = 0; i < ROUTES.length; i++) {
      var route = ROUTES[i];
      var match = hash.match(route.pattern);
      if (match) {
        var params = route.param ? {} : {};
        if (route.param && match[1]) {
          params[route.param] = decodeURIComponent(match[1]);
        }
        route.view(main, params);
        updateSidebarActive(hash);
        window.scrollTo(0, 0);
        return;
      }
    }
    viewNotFound(main);
    updateSidebarActive(hash);
  }

  /* ═══════════════════════════════════════════
     SECTION 7: SIDEBAR
     ═══════════════════════════════════════════ */

  function renderSidebar() {
    var doctrinesEl = document.getElementById('sidebar-doctrines');
    doctrinesEl.innerHTML = '';

    if (!State.manifest) return;

    State.manifest.doctrines.forEach(function (doctrine) {
      var details = el('details', { class: 'sidebar-doctrine', open: '' });
      details.appendChild(el('summary', {}, doctrine.title));
      var list = el('div', { class: 'sidebar-claim-list' });
      doctrine.claims.forEach(function (mc) {
        var dimmed = State.lens && !(mc.profileOutcomes || []).some(function (o) { return o.profileId === State.lens; });
        var link = el('a', {
          class: 'sidebar-link sidebar-claim-link' + (dimmed ? ' dimmed' : ''),
          href: '#/claim/' + mc.id,
          'data-route': '#/claim/' + mc.id,
        }, [
          el('span', { class: 'status-dot status-dot--' + mc.status }),
          text(mc.humanTitle),
        ]);
        list.appendChild(link);
      });
      details.appendChild(list);
      doctrinesEl.appendChild(details);
    });

    /* profiles */
    var profilesEl = document.getElementById('sidebar-profiles');
    profilesEl.innerHTML = '';
    State.manifest.profiles.forEach(function (p) {
      profilesEl.appendChild(el('a', {
        class: 'sidebar-link',
        href: '#/profile/' + p.id,
        'data-route': '#/profile/' + p.id,
      }, p.name));
    });

    updateSidebarActive(location.hash || '#/');
  }

  function updateSidebarActive(hash) {
    var links = document.querySelectorAll('.sidebar-link');
    links.forEach(function (link) {
      var route = link.getAttribute('data-route') || link.getAttribute('href');
      if (route === hash || (hash.startsWith(route) && route.length > 2)) {
        link.classList.add('sidebar-link--active');
      } else {
        link.classList.remove('sidebar-link--active');
      }
    });
  }

  /* sidebar toggle (mobile) */
  function initSidebarToggle() {
    var toggle = document.getElementById('sidebar-toggle');
    var overlay = document.getElementById('sidebar-overlay');
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-open');
    });
    overlay.addEventListener('click', function () {
      document.body.classList.remove('sidebar-open');
    });
    /* close sidebar on nav */
    window.addEventListener('hashchange', function () {
      document.body.classList.remove('sidebar-open');
    });
  }

  /* ═══════════════════════════════════════════
     SECTION 8: SEARCH
     ═══════════════════════════════════════════ */

  function buildSearchIndex() {
    var entries = [];
    allManifestClaims().forEach(function (mc) {
      entries.push({
        type: 'claim',
        title: mc.humanTitle,
        text: (mc.humanTitle + ' ' + mc.statement + ' ' + (mc.passages || []).join(' ')).toLowerCase(),
        href: '#/claim/' + mc.id,
      });
    });
    (State.manifest.profiles || []).forEach(function (p) {
      entries.push({
        type: 'profile',
        title: p.name,
        text: (p.name + ' ' + p.tradition + ' ' + p.id).toLowerCase(),
        href: '#/profile/' + p.id,
      });
    });
    State.searchIndex = entries;
  }

  function searchQuery(term) {
    if (!term || term.length < 2 || !State.searchIndex) return [];
    var t = term.toLowerCase();
    return State.searchIndex.filter(function (e) { return e.text.indexOf(t) !== -1; }).slice(0, 10);
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    var dropdown = document.getElementById('search-results');
    var timer;
    var activeIdx = -1;

    function renderResults(results) {
      dropdown.innerHTML = '';
      if (!results.length) { dropdown.hidden = true; return; }
      dropdown.hidden = false;
      activeIdx = -1;
      results.forEach(function (r, i) {
        var item = el('a', { class: 'search-result', href: r.href, 'data-idx': String(i) }, [
          el('span', { class: 'search-result-type' }, r.type),
          text(r.title),
        ]);
        dropdown.appendChild(item);
      });
    }

    function highlight(idx) {
      var items = dropdown.querySelectorAll('.search-result');
      items.forEach(function (it, i) {
        it.classList.toggle('search-result--active', i === idx);
      });
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        renderResults(searchQuery(input.value.trim()));
      }, 200);
    });

    input.addEventListener('keydown', function (e) {
      var items = dropdown.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') { activeIdx = Math.min(activeIdx + 1, items.length - 1); highlight(activeIdx); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { activeIdx = Math.max(activeIdx - 1, 0); highlight(activeIdx); e.preventDefault(); }
      else if (e.key === 'Enter' && activeIdx >= 0 && items[activeIdx]) {
        location.hash = items[activeIdx].getAttribute('href');
        dropdown.hidden = true;
        input.value = '';
        input.blur();
        e.preventDefault();
      } else if (e.key === 'Escape') { dropdown.hidden = true; input.blur(); }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.topbar-search')) dropdown.hidden = true;
    });

    /* clicking a result */
    dropdown.addEventListener('click', function (e) {
      var result = e.target.closest('.search-result');
      if (result) {
        input.value = '';
        dropdown.hidden = true;
      }
    });
  }

  /* ═══════════════════════════════════════════
     SECTION 9: LENS
     ═══════════════════════════════════════════ */

  function filterByLens(claims) {
    if (!State.lens) return claims.slice();
    /* sort: relevant first, dimmed last */
    return claims.slice().sort(function (a, b) {
      var aRel = (a.profileOutcomes || []).some(function (o) { return o.profileId === State.lens; });
      var bRel = (b.profileOutcomes || []).some(function (o) { return o.profileId === State.lens; });
      if (aRel && !bRel) return -1;
      if (!aRel && bRel) return 1;
      return 0;
    });
  }

  function initLens() {
    var select = document.getElementById('lens-select');
    (State.manifest.profiles || []).forEach(function (p) {
      select.appendChild(el('option', { value: p.id }, p.name));
    });
    /* restore */
    var saved = sessionStorage.getItem('opus-lens');
    if (saved) { select.value = saved; State.lens = saved; }

    select.addEventListener('change', function () {
      State.lens = select.value;
      if (select.value) sessionStorage.setItem('opus-lens', select.value);
      else sessionStorage.removeItem('opus-lens');
      renderSidebar();
      navigate();
    });
  }

  /* ═══════════════════════════════════════════
     SECTION 10: BOOT
     ═══════════════════════════════════════════ */

  function boot() {
    loadBundle().then(function () {
      renderSidebar();
      buildSearchIndex();
      initLens();
      initSearch();
      initSidebarToggle();

      window.addEventListener('hashchange', navigate);
      navigate();
    }).catch(function (err) {
      var main = document.getElementById('main-content');
      main.innerHTML = '';
      main.appendChild(el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-state-icon' }, '!'),
        el('p', {}, 'Failed to load manifest: ' + err.message),
      ]));
    });
  }

  boot();
})();
