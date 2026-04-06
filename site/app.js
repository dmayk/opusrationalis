async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const ch of children) node.appendChild(ch);
  return node;
}

function renderClaim(claim) {
  const meta = document.getElementById("claimMeta");
  const statement = document.getElementById("claimStatement");
  const passages = document.getElementById("passages");

  meta.textContent = `id=${claim.id} • resolution_status=${claim.resolution_status} • stability=${claim.stability_score} • contestation=${claim.contestation_score}`;
  statement.textContent = claim.statement;

  passages.innerHTML = "";
  for (const p of (claim.passages || [])) {
    const wrap = el("div", { class: "passage" });
    wrap.appendChild(el("h4", { html: `${escapeHtml(p.reference)} <span class="muted">(${escapeHtml(p.original_language || "unknown")})</span>` }));

    wrap.appendChild(el("div", { class: "kv" }, [
      el("div", { class: "k" , html: "Original (as stored)" }),
      el("div", { class: "v" , html: `<pre class="block">${escapeHtml(p.original_text || "")}</pre>` }),
    ]));

    const translations = p.translations || {};
    const keys = Object.keys(translations);
    if (keys.length) {
      const tBox = el("div", { class: "kv" });
      for (const k of keys) {
        tBox.appendChild(el("div", { class: "k", html: escapeHtml(k) }));
        tBox.appendChild(el("div", { class: "v", html: `<pre class="block">${escapeHtml(translations[k])}</pre>` }));
      }
      wrap.appendChild(tBox);
    }

    passages.appendChild(wrap);
  }
}

function renderTreeNode(node, depth = 0) {
  const nodeBox = el("div", { class: `tree-node tree-node-${node.node_type} tree-depth-${depth}` });
  
  const header = el("div", { class: "tree-node-header" });
  header.appendChild(el("span", { class: `tree-node-type-badge ${node.node_type}`, html: node.node_type }));
  header.appendChild(el("span", { class: "tree-node-status", html: `[${node.status}]` }));
  header.appendChild(el("span", { class: "tree-node-id", html: `id=${escapeHtml(node.node_id)}` }));
  nodeBox.appendChild(header);

  nodeBox.appendChild(el("p", { class: "tree-node-summary", html: escapeHtml(node.summary || "") }));

  // Profile scope
  if (node.profiles_in_scope && node.profiles_in_scope.length) {
    const scopeBox = el("div", { class: "tree-node-profiles" });
    scopeBox.appendChild(el("strong", { html: "Profiles:" }));
    node.profiles_in_scope.forEach(pid => {
      scopeBox.appendChild(el("span", { class: "profile-tag", html: escapeHtml(pid) }));
    });
    nodeBox.appendChild(scopeBox);
  }

  // Depends on
  if (node.depends_on) {
    const depsBox = el("div", { class: "tree-depends-on" });
    depsBox.appendChild(el("strong", { html: "Depends on:" }));
    const depDiv = el("div", { class: "tree-depends-content" });
    depDiv.appendChild(el("div", { html: `Type: <code>${escapeHtml(node.depends_on.type)}</code>` }));
    if (node.depends_on.references && node.depends_on.references.length) {
      const refList = el("div");
      refList.appendChild(el("strong", { html: "References:" }));
      const ul = el("ul");
      node.depends_on.references.forEach(ref => {
        ul.appendChild(el("li", { html: `<code>${escapeHtml(ref)}</code>` }));
      });
      refList.appendChild(ul);
      depDiv.appendChild(refList);
    }
    if (node.depends_on.notes) {
      depDiv.appendChild(el("div", { class: "muted", html: escapeHtml(node.depends_on.notes) }));
    }
    depsBox.appendChild(depDiv);
    nodeBox.appendChild(depsBox);
  }

  // Divergence point
  if (node.divergence_point && node.divergence_point.kind) {
    const divBox = el("div", { class: "tree-divergence" });
    divBox.appendChild(el("strong", { html: "Divergence point:" }));
    divBox.appendChild(el("div", { html: `<strong>${escapeHtml(node.divergence_point.label)}</strong> (${escapeHtml(node.divergence_point.kind)})` }));
    divBox.appendChild(el("div", { class: "muted", html: escapeHtml(node.divergence_point.description || "") }));
    nodeBox.appendChild(divBox);
  }

  // Supporting evidence
  if (node.supporting_evidence && node.supporting_evidence.length) {
    const evidBox = el("div", { class: "tree-evidence" });
    evidBox.appendChild(el("strong", { html: "Supporting evidence:" }));
    const list = el("ul");
    node.supporting_evidence.forEach(ev => {
      const item = el("li");
      const typeStr = ev.source_type ? `<strong>${escapeHtml(ev.source_type)}</strong>` : "unknown";
      const refStr = ev.reference ? `<code>${escapeHtml(ev.reference)}</code>` : "(no ref)";
      const weightStr = ev.weight ? ` [${escapeHtml(ev.weight)}]` : "";
      item.innerHTML = `${typeStr}: ${refStr}${weightStr}`;
      if (ev.text_quoted) {
        const q = el("blockquote", { class: "evidence-quote" });
        q.textContent = ev.text_quoted;
        item.appendChild(q);
      }
      list.appendChild(item);
    });
    evidBox.appendChild(list);
    nodeBox.appendChild(evidBox);
  }

  // Counter evidence
  if (node.counter_evidence && node.counter_evidence.length) {
    const evidBox = el("div", { class: "tree-counter-evidence" });
    evidBox.appendChild(el("strong", { html: "Counter evidence:" }));
    const list = el("ul");
    node.counter_evidence.forEach(ev => {
      const item = el("li");
      const typeStr = ev.source_type ? `<strong>${escapeHtml(ev.source_type)}</strong>` : "unknown";
      const refStr = ev.reference ? `<code>${escapeHtml(ev.reference)}</code>` : "(no ref)";
      const weightStr = ev.weight ? ` [${escapeHtml(ev.weight)}]` : "";
      item.innerHTML = `${typeStr}: ${refStr}${weightStr}`;
      if (ev.text_quoted) {
        const q = el("blockquote", { class: "counter-quote" });
        q.textContent = ev.text_quoted;
        item.appendChild(q);
      }
      list.appendChild(item);
    });
    evidBox.appendChild(list);
    nodeBox.appendChild(evidBox);
  }

  // Notes
  if (node.notes) {
    const noteBox = el("div", { class: "tree-notes" });
    noteBox.appendChild(el("strong", { html: "Notes:" }));
    noteBox.appendChild(el("p", { class: "muted", html: escapeHtml(node.notes) }));
    nodeBox.appendChild(noteBox);
  }

  // Children
  if (node.children && node.children.length) {
    const childrenBox = el("div", { class: "tree-children" });
    node.children.forEach(child => {
      childrenBox.appendChild(renderTreeNode(child, depth + 1));
    });
    nodeBox.appendChild(childrenBox);
  }

  return nodeBox;
}

function renderTree(tree) {
  const root = document.getElementById("tree");
  root.innerHTML = "";

  if (!tree || !tree.root) {
    root.appendChild(el("p", { class: "muted", html: "No tree data." }));
    return;
  }

  // Summary
  const sumBox = el("div", { class: "tree-summary-box" });
  sumBox.appendChild(el("p", { html: escapeHtml(tree.resolution_summary || "") }));
  root.appendChild(sumBox);

  // Metrics
  const metricsBox = el("div", { class: "tree-metrics" });
  const m = tree.metrics || {};
  metricsBox.appendChild(el("div", { html: `<strong>Stability:</strong> ${(m.stability_score * 100).toFixed(0)}%` }));
  metricsBox.appendChild(el("div", { html: `<strong>Contestation:</strong> ${(m.contestation_score * 100).toFixed(0)}%` }));
  metricsBox.appendChild(el("div", { html: `<strong>Consensus depth:</strong> ${(m.depth_of_consensus * 100).toFixed(0)}%` }));
  if (m.prior_dependence && m.prior_dependence.length) {
    const pd = el("div");
    pd.appendChild(el("strong", { html: "Prior dependence:" }));
    const ul = el("ul");
    m.prior_dependence.forEach(p => ul.appendChild(el("li", { html: escapeHtml(p) })));
    pd.appendChild(ul);
    metricsBox.appendChild(pd);
  }
  root.appendChild(metricsBox);

  // Tree structure
  root.appendChild(renderTreeNode(tree.root, 0));

  // Profile outcomes
  if (tree.profile_outcomes && tree.profile_outcomes.length) {
    const outBox = el("div", { class: "tree-profile-outcomes" });
    outBox.appendChild(el("h3", { html: "Profile outcomes" }));
    tree.profile_outcomes.forEach(outcome => {
      const oBox = el("div", { class: "profile-outcome" });
      oBox.appendChild(el("div", { class: "outcome-header" }, [
        el("strong", { html: escapeHtml(outcome.profile_id) }),
        el("span", { class: `outcome-badge ${outcome.outcome}`, html: escapeHtml(outcome.outcome.replace(/_/g, " ")) })
      ]));
      oBox.appendChild(el("p", { class: "outcome-rationale", html: escapeHtml(outcome.rationale_summary) }));
      outBox.appendChild(oBox);
    });
    root.appendChild(outBox);
  }
}

function renderDebate(debate) {
  const root = document.getElementById("debate");
  root.innerHTML = "";

  const rounds = debate.rounds || [];
  if (!rounds.length) {
    root.appendChild(el("p", { class: "muted", html: "No rounds present in snapshot." }));
    return;
  }

  for (const r of rounds) {
    const roundBox = el("div", { class: "round" });
    roundBox.appendChild(el("h3", { html: `Round ${escapeHtml(r.round_number ?? "?")}` }));

    const moves = r.moves || [];
    for (const m of moves) {
      const moveBox = el("div", { class: "move" });
      const head = el("div", { class: "head" });

      head.appendChild(el("span", { class: "badge", html: `move_id=${escapeHtml(m.move_id || "")}` }));
      head.appendChild(el("span", { class: "badge", html: `role=${escapeHtml(m.agent_role || "")}` }));
      head.appendChild(el("span", { class: "badge", html: `profile=${escapeHtml(m.profile_id ?? "null")}` }));
      head.appendChild(el("span", { class: "badge", html: `model=${escapeHtml(m.author_model || "")}` }));
      head.appendChild(el("span", { class: "badge", html: `intent=${escapeHtml(m.intent || "")}` }));

      moveBox.appendChild(head);
      moveBox.appendChild(el("p", { class: "content", html: escapeHtml(m.content || "") }));

      const citations = m.citations || [];
      if (citations.length) {
        const c = el("div", { class: "citations" });
        c.appendChild(el("div", { html: "Citations (as recorded in snapshot):" }));
        const ul = el("ul");
        for (const ci of citations) {
          const ref = ci.reference ? `<code>${escapeHtml(ci.reference)}</code>` : "<code>(missing reference)</code>";
          const st = ci.source_type ? escapeHtml(ci.source_type) : "unknown";
          const tq = ci.text_quoted ? ` — "${escapeHtml(ci.text_quoted)}"` : "";
          ul.appendChild(el("li", { html: `${st}: ${ref}${tq}` }));
        }
        c.appendChild(ul);
        moveBox.appendChild(c);
      }

      roundBox.appendChild(moveBox);
    }

    root.appendChild(roundBox);
  }
}

async function loadAndRender(claimId) {
  const claimPath = `./data/claims/${claimId}.json`;
  const debatePath = `./data/debates/${claimId}.json`;
  const treePath = `./data/trees/${claimId}-tree-0001.json`;

  const [claim, debate, tree] = await Promise.all([
    loadJson(claimPath),
    loadJson(debatePath),
    loadJson(treePath),
  ]);

  renderClaim(claim);
  renderTree(tree);
  renderDebate(debate);
}

(function main() {
  const select = document.getElementById("claimSelect");
  const claimId = select.value;

  loadAndRender(claimId).catch(err => {
    console.error(err);
    const claimMeta = document.getElementById("claimMeta");
    claimMeta.innerHTML = `<span class="warn">Error:</span> ${escapeHtml(err.message)}`;
  });

  select.addEventListener("change", () => {
    loadAndRender(select.value).catch(err => {
      console.error(err);
    });
  });
})();
