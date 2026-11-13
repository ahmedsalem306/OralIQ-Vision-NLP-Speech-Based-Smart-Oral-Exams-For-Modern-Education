# oralliq.com cutover

The user supplied `oralliq.com` on 2026-11-14. Public DNS currently resolves the
apex/www to parking addresses; `api.oralliq.com` has no address. Nameservers are
`ns73.domaincontrol.com` and `ns74.domaincontrol.com`. This is a DNS observation,
not confirmation of access to the owner's DNS account. No DNS records were changed.

## DNS and frontend

Create an **A** record named **api**, value **217.76.56.223**, TTL 600 (or the
provider's default). Do not create an API AAAA record without verified IPv6 routing.
Keep frontend DNS separate: add `oralliq.com` and `www.oralliq.com` to the existing
Vercel project and copy its exact required DNS records. Do not guess a generic
Vercel IP/CNAME or point the frontend at this API-only VPS.

Verify public DNS before certificate issuance. Prepare these production values;
they do not belong in the isolated load-test environment:

```dotenv
API_DOMAIN=api.oralliq.com
ACME_EMAIL=ghartech1@gmail.com
FRONTEND_URL=https://oralliq.com
ALLOWED_ORIGINS=https://oralliq.com,https://www.oralliq.com,https://oral-iq-vision-nlp-speech-based-sma.vercel.app
```

Vercel's production build must eventually use:

```dotenv
VITE_API_URL=https://api.oralliq.com/api/v1
VITE_SITE_URL=https://oralliq.com
```

Do not redeploy these API settings until migration, model checks and HTTPS pass.
Update Google's authorized origins/redirect settings and Kashier's live callback
configuration to the confirmed domains, then test login and payments.

## Preserve the existing Nginx

Nginx already owns host port 80. The default Compose proxy also publishes 80/443,
so use the prepared override instead of stopping or overwriting Nginx:

```sh
docker compose -f compose.yaml -f compose.nginx.yaml config --quiet
docker compose -f compose.yaml -f compose.nginx.yaml up -d --build
```

Use both `-f` arguments for subsequent production Compose operations. Keep this
production project/database separate from `oraliq-loadtest`. The override excludes
Caddy by profile and exposes the production API only at `127.0.0.1:18001`.
Do not enable the `standalone-caddy` profile alongside host Nginx.

`nginx.oralliq.conf` is a prepared virtual host, **not installed or enabled**. Before
enabling its TLS block, obtain a certificate for `api.oralliq.com`. For HTTP-01,
temporarily serve only `/.well-known/acme-challenge/` from `/var/www/oraliq-acme`
in a port-80 virtual host; return 503 for other API requests until TLS is ready.
Do not expose the load-test API at port 18000 or point Nginx at it.

The Compose override was validated on the VPS and the virtual host passed `nginx -t`
using a temporary self-signed certificate in a separate configuration. This is a
syntax check, not public TLS issuance, renewal verification or a live proxy test.

After issuance, install the complete virtual host, run `nginx -t`, then reload.
Verify certificate renewal and its Nginx reload hook. The template overwrites
forwarded identity headers and omits API access logs to reduce student-data
exposure; retain private error logs and aggregate operational metrics.

Before enabling real writes, complete [the migration and release checks](README.md).
The current staging database has fresh test secrets and is not a migrated user DB.
