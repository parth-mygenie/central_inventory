# Maintenance Rules

> When to update each governance layer.

---

| Layer | Trigger | Who |
|-------|---------|-----|
| **L0 Baseline Index** | Owner-approved promotion ONLY | Owner + agent |
| **L1 Control Dashboard** | Every deploy / branch change | Agent |
| **L2 Handover Protocol** | Branch change / credential rotation / architecture change | Agent |
| **L3 CR Registry** | Any CR status change | Agent (edit registry.json, run generator) |
| **L4 Bug Tracker** | Any BUG status change | Agent (edit registry.json, run generator) |
| **L5 Env & Config** | Any env var / feature flag / config change | Agent |
| **L6 Sprint Status** | Sprint start / end / item assignment | Agent |
| **L7 File Ownership** | New frozen file / new conflict zone discovered | Agent |
| **L8 Access Registry** | Credential rotation / new test account | Agent |
| **L9 Open Gaps** | Every QA pass / sprint review | Agent |
| **registry.json** | Any CR or BUG status change | Agent |
| **Dashboard data** | After any registry.json edit | `node control/gen_dashboard_data.js` |
| **Agent Prompt** | Architecture change / governance rule change | Agent |
| **Code Gate Policy** | Policy change approved by owner | Owner + agent |

## Golden Rule

**Never hand-edit generated JSONs** (`frontend/public/__dev/data/*.json`).

Edit `control/registry.json` → run `node control/gen_dashboard_data.js` → verify with `--check`.

## Drift Prevention

Run before every commit:
```bash
node control/gen_dashboard_data.js --check
```
Exits non-zero if committed JSONs are stale. Integrate into CI/pre-commit hook.
