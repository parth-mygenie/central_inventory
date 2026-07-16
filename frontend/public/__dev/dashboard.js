/**
 * Dev Control Dashboard — Self-contained JS. Zero coupling to app code.
 * Reads generated JSON from ./data/ and renders read-only triage UI.
 */

(async function () {
  'use strict';

  // ── Fetch data ──────────────────────────────────────────────
  let summary, crs, bugs, debt;
  try {
    [summary, crs, bugs, debt] = await Promise.all([
      fetch('./data/summary.json').then(r => r.json()),
      fetch('./data/crs.json').then(r => r.json()),
      fetch('./data/bugs.json').then(r => r.json()),
      fetch('./data/debt.json').then(r => r.json()),
    ]);
  } catch (e) {
    document.getElementById('content').innerHTML =
      '<div class="no-data">Failed to load dashboard data. Run: <code>node control/gen_dashboard_data.js</code></div>';
    return;
  }

  // ── Populate topbar ─────────────────────────────────────────
  document.getElementById('gen-time').textContent =
    'Generated: ' + new Date(summary.generated_at).toLocaleString();
  document.getElementById('branch-tag').textContent =
    summary.branch || '';

  // ── Summary cards ───────────────────────────────────────────
  const cardsEl = document.getElementById('summary-cards');
  const cards = [
    { value: summary.totals.crs, label: 'Total CRs', color: 'blue' },
    { value: summary.totals.bugs, label: 'Total Bugs', color: 'orange' },
    { value: summary.totals.debt, label: 'Closure Debt', color: 'red' },
    { value: summary.signoff_pending, label: 'Signoff Pending', color: 'purple' },
    { value: summary.crs_by_status.CLOSED || 0, label: 'CRs Closed', color: 'green' },
    { value: summary.crs_by_status.PLANNED || 0, label: 'CRs Planned', color: 'cyan' },
    { value: summary.bugs_by_status.OPEN || 0, label: 'Bugs Open', color: 'red' },
    { value: summary.bugs_by_status.ACCEPTED || 0, label: 'Bugs Accepted', color: 'orange' },
  ];
  cardsEl.innerHTML = cards.map(c =>
    `<div class="summary-card">
      <div class="card-value ${c.color}">${c.value}</div>
      <div class="card-label">${c.label}</div>
    </div>`
  ).join('');

  // ── Tab switching ───────────────────────────────────────────
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      applyFilters();
    });
  });

  // ── Populate filters ────────────────────────────────────────
  const sprintFilter = document.getElementById('sprint-filter');
  const severityFilter = document.getElementById('severity-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');

  summary.sprints.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = `${s.key}: ${s.name}`;
    sprintFilter.appendChild(opt);
  });
  // Add "Unassigned"
  const uOpt = document.createElement('option');
  uOpt.value = '__unassigned__';
  uOpt.textContent = 'Unassigned';
  sprintFilter.appendChild(uOpt);

  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    severityFilter.appendChild(opt);
  });

  const allStatuses = new Set();
  [...crs, ...bugs].forEach(i => allStatuses.add(i.status));
  [...allStatuses].sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusFilter.appendChild(opt);
  });

  // ── Badge helpers ───────────────────────────────────────────
  function badge(text, prefix) {
    if (!text) return '';
    const cls = prefix + '-' + text.toLowerCase().replace(/\s/g, '_');
    return `<span class="badge ${cls}">${text}</span>`;
  }

  function artifactBadge(status) {
    return badge(status, 'badge');
  }

  function completenessBar(c) {
    const color = c.pct === 100 ? 'var(--accent-green)' :
      c.pct >= 70 ? 'var(--accent-orange)' : 'var(--accent-red)';
    return `<span class="completeness-bar">
      <span class="bar"><span class="bar-fill" style="width:${c.pct}%;background:${color}"></span></span>
      ${c.done}/${c.total}
    </span>`;
  }

  // ── Expand/collapse ─────────────────────────────────────────
  function toggleRow(prefix, id) {
    const detailTr = document.getElementById(prefix + '-detailrow-' + id);
    const icon = document.getElementById(prefix + '-icon-' + id);
    if (detailTr) {
      detailTr.classList.toggle('open');
      icon?.classList.toggle('open');
    }
  }
  window.toggleRow = toggleRow;

  // ── Copy to clipboard ───────────────────────────────────────
  function copyPath(path, btnId) {
    navigator.clipboard.writeText(path).then(() => {
      const btn = document.getElementById(btnId);
      if (btn) { btn.textContent = 'copied'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500); }
    });
  }
  window.copyPath = copyPath;

  // ── Render artifact detail card ─────────────────────────────
  function renderDetailCard(item) {
    const c = item.completeness || { done: 0, total: 7 };
    const artRows = (item.artifact_refs || []).map((a, idx) => {
      const dotClass = a.status === 'DONE' ? 'done' : a.status === 'WAIVED' ? 'waived' : a.status === 'PENDING' ? 'pending' : 'missing';
      const tags = (a.tags || []).map(t => {
        const cls = t === 'PRE-GOVERNANCE' ? 'art-tag-pre-governance' : t === 'AWAITING-OWNER' ? 'art-tag-awaiting-owner' : t === 'WAIVED' ? 'art-tag-waived' : 'art-tag-default';
        return `<span class="art-tag ${cls}">${t}</span>`;
      }).join(' ');
      const statusTag = (a.status !== 'DONE' && a.tags?.length === 0) ? `<span class="art-tag art-tag-${a.status === 'MISSING' ? 'default' : 'awaiting-owner'}">${a.status}</span>` : '';

      const paths = (a.paths || []).map((p, pi) => {
        const btnId = `copy-${item.id}-${idx}-${pi}`;
        const filename = p.split('/').pop();
        return `<div class="art-path-row">
          <span class="art-path-text" title="${p}">${filename}</span>
          <button class="copy-btn" id="${btnId}" onclick="event.stopPropagation(); copyPath('${p.replace(/'/g, "\\'")}', '${btnId}')">copy</button>
        </div>`;
      }).join('');
      const emptyMsg = (!a.paths || a.paths.length === 0) ? '<div class="art-empty">No documents linked</div>' : '';

      return `<div class="artifact-row">
        <div class="art-dot ${dotClass}"></div>
        <div class="art-label-col">
          <div class="art-label">${a.label}</div>
          <div class="art-tags">${tags}${statusTag}</div>
        </div>
        <div class="art-paths-col">${paths}${emptyMsg}</div>
      </div>`;
    }).join('');

    return `<div class="detail-card">
      <div class="detail-header">
        <span class="detail-id">${item.id}</span>
        <span class="detail-title">${item.title}</span>
        ${badge(item.severity, 'badge')}
        ${badge(item.status, 'badge')}
      </div>
      <div class="detail-meta">
        <span><strong>Sprint:</strong> ${item.sprint_name || 'Unassigned'}</span>
        <span><strong>Phase:</strong> ${item.phase || '—'}</span>
        ${item.files?.length ? `<span><strong>Files:</strong> ${item.files.length}</span>` : ''}
        ${item.doc_count ? `<span><strong>Docs:</strong> ${item.doc_count}</span>` : ''}
      </div>
      ${item.notes ? `<div style="color:var(--text-muted);font-size:12px;margin-bottom:12px">${item.notes}</div>` : ''}
      ${item.files?.length ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px"><strong style="color:var(--text-secondary)">Files touched:</strong> <code style="font-family:var(--font-mono);font-size:11px">${item.files.join(', ')}</code></div>` : ''}
      <div class="artifact-block">
        <div class="artifact-block-header">
          <span>Artifact References</span>
          <span class="art-count">(${c.done}/${c.total})</span>
        </div>
        ${artRows}
      </div>
    </div>`;
  }

  // ── Render tables ───────────────────────────────────────────
  function renderDebtTable(items) {
    if (!items.length) return '<div class="no-data">No closure debt. All artifacts accounted for.</div>';
    return `<table class="data-table">
      <thead><tr>
        <th></th><th>ID</th><th>Type</th><th>Title</th><th>Status</th><th>Sprint</th><th>Debt Reasons</th>
      </tr></thead>
      <tbody>${items.map(d => {
        const fullItem = [...crs, ...bugs].find(i => i.id === d.id) || d;
        return `
        <tr class="expandable" onclick="toggleRow('debt','${d.id}')">
          <td><span class="expand-icon" id="debt-icon-${d.id}">&#9654;</span></td>
          <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap">${d.id}</td>
          <td>${badge(d.type, 'badge')}</td>
          <td>${d.title}</td>
          <td>${badge(d.status, 'badge')}</td>
          <td style="font-size:11px;color:var(--text-muted)">${d.sprint_name || '—'}</td>
          <td><div class="debt-reasons">${d.debt_reasons.map(r =>
            `<span class="debt-reason-tag">${r}</span>`).join('')}</div></td>
        </tr>
        <tr class="detail-row" id="debt-detailrow-${d.id}"><td colspan="7"><div class="detail-content">
          ${renderDetailCard(fullItem)}
        </div></td></tr>
      `}).join('')}</tbody>
    </table>`;
  }

  function renderBugTable(items) {
    if (!items.length) return '<div class="no-data">No bugs match filters.</div>';
    return `<table class="data-table">
      <thead><tr>
        <th></th><th>ID</th><th>Severity</th><th>Title</th><th>Status</th><th>Sprint</th><th>Docs</th><th>Artifacts</th>
      </tr></thead>
      <tbody>${items.map(b => `
        <tr class="expandable" onclick="toggleRow('bug','${b.id}')">
          <td><span class="expand-icon" id="bug-icon-${b.id}">&#9654;</span></td>
          <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap">${b.id}</td>
          <td>${badge(b.severity, 'badge')}</td>
          <td>${b.title}</td>
          <td>${badge(b.status, 'badge')}</td>
          <td style="font-size:11px;color:var(--text-muted)">${b.sprint_name || '—'}</td>
          <td style="font-family:var(--font-mono);font-size:11px;text-align:center">${b.doc_count || 0}</td>
          <td>${completenessBar(b.completeness)}</td>
        </tr>
        <tr class="detail-row" id="bug-detailrow-${b.id}"><td colspan="8"><div class="detail-content">
          ${renderDetailCard(b)}
        </div></td></tr>
      `).join('')}</tbody>
    </table>`;
  }

  function renderCRTable(items) {
    if (!items.length) return '<div class="no-data">No CRs match filters.</div>';
    return `<table class="data-table">
      <thead><tr>
        <th></th><th>ID</th><th>Phase</th><th>Title</th><th>Status</th><th>Sprint</th><th>Docs</th><th>Artifacts</th>
      </tr></thead>
      <tbody>${items.map(c => `
        <tr class="expandable" onclick="toggleRow('cr','${c.id}')">
          <td><span class="expand-icon" id="cr-icon-${c.id}">&#9654;</span></td>
          <td style="font-family:var(--font-mono);font-size:12px;white-space:nowrap">${c.id}</td>
          <td style="font-size:11px;color:var(--text-muted)">${c.phase || '—'}</td>
          <td>${c.title}</td>
          <td>${badge(c.status, 'badge')}</td>
          <td style="font-size:11px;color:var(--text-muted)">${c.sprint_name || '—'}</td>
          <td style="font-family:var(--font-mono);font-size:11px;text-align:center">${c.doc_count || 0}</td>
          <td>${completenessBar(c.completeness)}</td>
        </tr>
        <tr class="detail-row" id="cr-detailrow-${c.id}"><td colspan="8"><div class="detail-content">
          ${renderDetailCard(c)}
        </div></td></tr>
      `).join('')}</tbody>
    </table>`;
  }

  // ── Filtering ───────────────────────────────────────────────
  function filterItems(items) {
    const search = searchInput.value.toLowerCase();
    const sprint = sprintFilter.value;
    const severity = severityFilter.value;
    const status = statusFilter.value;

    return items.filter(item => {
      if (sprint === '__unassigned__' && item.sprint_key) return false;
      if (sprint && sprint !== '__unassigned__' && item.sprint_key !== sprint) return false;
      if (severity && item.severity !== severity) return false;
      if (status && item.status !== status) return false;
      if (search) {
        const haystack = [
          item.id, item.title, item.notes,
          ...(item.files || []), item.phase,
          item.sprint_name, item.status, item.severity
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function applyFilters() {
    document.getElementById('tab-debt').innerHTML = renderDebtTable(filterItems(debt));
    document.getElementById('tab-bugs').innerHTML = renderBugTable(filterItems(bugs));
    document.getElementById('tab-crs').innerHTML = renderCRTable(filterItems(crs));
  }

  // Wire up filters
  searchInput.addEventListener('input', applyFilters);
  sprintFilter.addEventListener('change', applyFilters);
  severityFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // ── CSV Export ──────────────────────────────────────────────
  document.getElementById('csv-export-btn').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab.active').dataset.tab;
    let data, filename;
    if (activeTab === 'crs') { data = filterItems(crs); filename = 'crs.csv'; }
    else if (activeTab === 'bugs') { data = filterItems(bugs); filename = 'bugs.csv'; }
    else { data = filterItems(debt); filename = 'debt.csv'; }

    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => k !== 'artifact_refs' && k !== 'completeness');
    const rows = data.map(item =>
      headers.map(h => {
        let val = item[h];
        if (Array.isArray(val)) val = val.join('; ');
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  });

  // ── Initial render ──────────────────────────────────────────
  applyFilters();

})();
