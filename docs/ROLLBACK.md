# OralIQ — Rollback Playbook

> Use this guide to revert a bad deployment as fast as possible.

---

## 1 — Vercel Rollback (Frontend)

### Option A: Vercel Dashboard (fastest)
1. Open [vercel.com/dashboard](https://vercel.com/dashboard) → your project → **Deployments** tab.
2. Find the last *good* deployment (before the broken one).
3. Click the **⋯** menu → **Promote to Production**.
4. Done — live in ~10 seconds.

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel rollback --scope=<team-or-username>
```
This rolls back to the previous production deployment automatically.

### Option C: Git revert
```bash
git revert HEAD        # creates a new commit undoing the last one
git push origin main   # triggers a new Vercel build
```

---

## 2 — Hugging Face Space Rollback (Backend)

HF Spaces are driven by git. Find the last good commit hash:

```bash
git log --oneline -10
# e.g.  061b5d5  feat: concurrent seats
#        a4f2c3e  fix: port 7860
```

Then force-push that commit as the new HEAD of the HF remote:

```bash
git push hf <good_commit_hash>:main --force
```

> **Important:** `hf` must be a configured remote pointing to
> `https://huggingface.co/spaces/ahmed2552/oraliq-api`.
> Add it once with:
> ```bash
> git remote add hf https://huggingface.co/spaces/ahmed2552/oraliq-api
> ```

HF will rebuild the Docker image from the reverted code.

---

## 3 — Database Rollback

### SQLite (local / dev)
```powershell
# List available backups
.\scripts\backup_db.ps1 -List

# Restore the latest backup
.\scripts\backup_db.ps1 -Restore

# Restore a specific backup
.\scripts\backup_db.ps1 -Restore -BackupFile ".\backend\data\backups\oraliq_20261031_120000.db"
```

### Postgres (production on HF)
```bash
# Restore from a pg_dump file
psql $DATABASE_URL < backups/oraliq_pg_20261031_120000.sql
```

---

## 4 — What to Check After a Rollback

1. `GET /health` → all models show `ready` or `not_loaded` (not `error`)
2. `GET /health/keys` → `"missing": []` (all 12 env vars present)
3. Login with Google and create a test exam — confirm it works end-to-end.
4. Check Sentry dashboard for any new errors.

---

## 5 — Quick Pre-Deploy Checklist

Before every deploy, run:

```powershell
# Backend tests
cd backend
python -m pytest app/tests -q -p no:warnings

# Frontend type-check
cd frontend
npx tsc --noEmit

# npm audit
npm audit

# Key check (after deploy)
curl https://ahmed2552-oraliq-api.hf.space/health/keys
```

All 74 backend tests must pass and `npm audit` must show 0 high/critical issues.
