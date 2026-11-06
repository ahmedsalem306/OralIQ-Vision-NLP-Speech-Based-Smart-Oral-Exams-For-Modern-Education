# Enable the production checks

`security.yml` is the prepared GitHub Actions workflow. It is intentionally stored as a template
here: the connected GitHub PAT rejected `.github/workflows/security.yml` because it lacks the
`workflow` scope. Application fixes were pushed without that restricted operation.

Using a GitHub session or credential authorized to manage workflows, copy this file to
`.github/workflows/security.yml` on `codex/contabo-production` and commit. It will run:

- Frontend typecheck, lint, build, tests, and npm audit.
- Backend tests with PostgreSQL 17 (including concurrent queue admission), backup tool tests,
  and pip-audit on Python 3.12.
- Linux Docker image build, non-root / dependency consistency checks, and a Trivy high/critical scan.

The container build downloads sizeable CPU libraries and needs adequate runner disk space.
The constraints file records audited versions; Linux/Python 3.12 build remains the compatibility
gate because local dependency resolution ran on Windows/Python 3.13.
Successful unit tests alone do not certify a clean image or successful real model inference.
Never copy production secrets into this workflow; its PostgreSQL credentials are only for its
ephemeral test service. Review results before deploying the server image.
