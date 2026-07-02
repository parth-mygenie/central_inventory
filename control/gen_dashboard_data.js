#!/usr/bin/env node
/**
 * gen_dashboard_data.js — Single Source of Truth Generator
 *
 * Reads: /app/control/registry.json
 * Writes: /app/frontend/public/__dev/data/{summary,crs,bugs,debt}.json
 *
 * Usage:
 *   node gen_dashboard_data.js          # Generate JSONs
 *   node gen_dashboard_data.js --check  # Drift lint (exit 1 if stale)
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'registry.json');
const OUT_DIR = path.join(__dirname, '..', 'frontend', 'public', '__dev', 'data');
const CHECK_MODE = process.argv.includes('--check');

// ── Load registry ──────────────────────────────────────────────
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const { meta, sprints, items } = registry;

// ── Artifact rules ─────────────────────────────────────────────
const ARTIFACT_LABELS = [
  'Session-Start', 'Intake', 'Impact-Analysis',
  'Impl-Plan', 'Code-Gate', 'QA-Report', 'Owner-Signoff'
];

function computeCompleteness(artifactRefs) {
  const total = artifactRefs.length;
  const done = artifactRefs.filter(a => a.status === 'DONE' || a.status === 'WAIVED').length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function countDocs(artifactRefs) {
  return artifactRefs.reduce((sum, a) => sum + (a.paths ? a.paths.length : 0), 0);
}

function isDebt(item) {
  // An item is in debt if it has any MISSING or PENDING artifact
  // UNLESS the item itself is PROPOSED (not yet started)
  if (item.status === 'PROPOSED') return false;
  return item.artifact_refs.some(a => a.status === 'MISSING' || a.status === 'PENDING');
}

function getDebtReasons(item) {
  const reasons = [];
  for (const a of item.artifact_refs) {
    if (a.status === 'MISSING') reasons.push(`${a.label}: MISSING`);
    if (a.status === 'PENDING') reasons.push(`${a.label}: PENDING`);
  }
  return reasons;
}

// ── Derive CRs ─────────────────────────────────────────────────
const crs = items.filter(i => i.type === 'CR').map(item => ({
  ...item,
  completeness: computeCompleteness(item.artifact_refs),
  doc_count: countDocs(item.artifact_refs),
  is_debt: isDebt(item),
  debt_reasons: getDebtReasons(item),
  sprint_name: item.sprint_key ? sprints[item.sprint_key]?.name || item.sprint_key : 'Unassigned'
}));

// ── Derive Bugs ────────────────────────────────────────────────
const bugs = items.filter(i => i.type === 'BUG').map(item => ({
  ...item,
  completeness: computeCompleteness(item.artifact_refs),
  doc_count: countDocs(item.artifact_refs),
  is_debt: isDebt(item),
  debt_reasons: getDebtReasons(item),
  sprint_name: item.sprint_key ? sprints[item.sprint_key]?.name || item.sprint_key : 'Unassigned'
}));

// ── Derive Debt ────────────────────────────────────────────────
const debtItems = items.filter(i => isDebt(i)).map(item => ({
  type: item.type,
  id: item.id,
  title: item.title,
  status: item.status,
  severity: item.severity,
  sprint_key: item.sprint_key,
  sprint_name: item.sprint_key ? sprints[item.sprint_key]?.name || item.sprint_key : 'Unassigned',
  debt_reasons: getDebtReasons(item),
  missing_count: item.artifact_refs.filter(a => a.status === 'MISSING').length,
  pending_count: item.artifact_refs.filter(a => a.status === 'PENDING').length
}));

// ── Derive Summary ─────────────────────────────────────────────
function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'UNKNOWN';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

const summary = {
  generated_at: new Date().toISOString(),
  project: meta.project,
  repo: meta.repo,
  branch: meta.branch,
  totals: {
    items: items.length,
    crs: crs.length,
    bugs: bugs.length,
    debt: debtItems.length
  },
  crs_by_status: countBy(crs, 'status'),
  bugs_by_status: countBy(bugs, 'status'),
  bugs_by_severity: countBy(bugs, 'severity'),
  debt_by_type: countBy(debtItems, 'type'),
  sprints: Object.entries(sprints).map(([key, s]) => ({
    key,
    ...s,
    cr_count: crs.filter(c => c.sprint_key === key).length,
    bug_count: bugs.filter(b => b.sprint_key === key).length
  })),
  signoff_pending: items.filter(i =>
    i.artifact_refs.some(a => a.label === 'Owner-Signoff' && a.status === 'PENDING')
  ).length,
  owner_signoff_breakdown: {
    pending: items.filter(i => i.artifact_refs.some(a => a.label === 'Owner-Signoff' && a.status === 'PENDING')).map(i => i.id),
    done: items.filter(i => i.artifact_refs.some(a => a.label === 'Owner-Signoff' && a.status === 'DONE')).map(i => i.id),
    waived: items.filter(i => i.artifact_refs.some(a => a.label === 'Owner-Signoff' && a.status === 'WAIVED')).map(i => i.id)
  }
};

// ── Output ─────────────────────────────────────────────────────
const outputs = {
  'summary.json': summary,
  'crs.json': crs,
  'bugs.json': bugs,
  'debt.json': debtItems
};

if (CHECK_MODE) {
  let drift = false;
  for (const [file, data] of Object.entries(outputs)) {
    const filePath = path.join(OUT_DIR, file);
    const newContent = JSON.stringify(data, null, 2) + '\n';
    if (!fs.existsSync(filePath)) {
      console.error(`DRIFT: ${file} does not exist. Run generator without --check.`);
      drift = true;
      continue;
    }
    const existing = fs.readFileSync(filePath, 'utf8');
    // Strip generated_at for comparison (timestamp always changes)
    const normalize = s => s.replace(/"generated_at":\s*"[^"]*"/, '"generated_at": "__STRIPPED__"');
    if (normalize(existing) !== normalize(newContent)) {
      console.error(`DRIFT: ${file} is stale. Regenerate with: node gen_dashboard_data.js`);
      drift = true;
    } else {
      console.log(`OK: ${file}`);
    }
  }
  process.exit(drift ? 1 : 0);
}

// Write mode
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [file, data] of Object.entries(outputs)) {
  const filePath = path.join(OUT_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Generated: ${filePath}`);
}

console.log(`\nDone. ${Object.keys(outputs).length} files written.`);
console.log(`Summary: ${summary.totals.crs} CRs, ${summary.totals.bugs} BUGs, ${summary.totals.debt} in debt.`);
