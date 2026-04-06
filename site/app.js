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
          const tq = ci.text_quoted ? ` — “${escapeHtml(ci.text_quoted)}”` : "";
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

  const [claim, debate] = await Promise.all([
    loadJson(claimPath),
    loadJson(debatePath),
  ]);

  renderClaim(claim);
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
