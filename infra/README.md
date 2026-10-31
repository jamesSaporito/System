# Infra

Terraform for AWS (Terraform `~> 1.17`, AWS provider `~> 6.70`, region `us-east-1`).

| Path                   | Purpose                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bootstrap/`           | Applied once from a laptop, with local state: the S3 bucket for every other stack's state, and the GitHub Actions OIDC provider plus `plan` / `apply` / `deploy` roles.                          |
| `envs/prod/`           | Production: the `jamessaporito.com` site, plus a private VPC and the Aurora PostgreSQL database (off until `enable_database = true`). Planned by `.github/workflows/infra.yml`, applied by hand. |
| `modules/network/`     | Private-only VPC: one subnet per availability zone, no internet gateway or NAT.                                                                                                                  |
| `modules/database/`    | Aurora PostgreSQL 18 Serverless v2 that pauses when idle, with a generated password in Secrets Manager.                                                                                          |
| `modules/static-site/` | One site: private S3 bucket (Origin Access Control), CloudFront with a clean-URL function, ACM certificate.                                                                                      |

## First-time setup

1. Install Terraform 1.17 (`brew install hashicorp/tap/terraform`) and sign in to AWS (see [Running Terraform locally](#running-terraform-locally)).
2. Bootstrap, then note its outputs:
   ```sh
   cd infra/bootstrap
   terraform init && terraform apply
   ```
   Its `terraform.tfstate` stays on your machine (gitignored). Keep a copy somewhere safe; if it's lost, the resources can be re-imported.
3. In GitHub, under **Settings → Secrets and variables → Actions → Variables**, add `TF_STATE_BUCKET`, `AWS_PLAN_ROLE_ARN`, `AWS_APPLY_ROLE_ARN` and `AWS_DEPLOY_ROLE_ARN` from those outputs. Under **Settings → Environments**, create `production`; add yourself as a required reviewer to make each apply wait for approval.
4. Create production, either from GitHub (**Actions → Infra → Run workflow** on `main`) or locally:
   ```sh
   cd infra/envs/prod
   cp backend.hcl.example backend.hcl   # fill in the bucket name
   terraform init -backend-config=backend.hcl
   terraform apply
   ```
5. Put the site live, see [Going live](#going-live).

## Going live

DNS stays at the registrar (Squarespace), so a few records are added there by hand. For `jamessaporito.com`:

1. After the first prod apply, add the `portfolio_bucket` and `portfolio_distribution_id` outputs as the GitHub variables `PORTFOLIO_BUCKET` and `PORTFOLIO_DISTRIBUTION_ID`.
2. At the registrar, add each CNAME from the `portfolio_certificate_validation` output, and wait until the certificate shows **Issued** in ACM (usually minutes).
3. Set `attach_domain = true` on `module "portfolio"` in `envs/prod/main.tf`, commit, and apply again. With it on before the records exist, the apply waits on validation.
4. At the registrar, point `www` at the `portfolio_cloudfront_domain` output with a CNAME, and forward the bare domain to `https://www.jamessaporito.com` (a bare domain can't have a CNAME).
5. Upload the photos: `pnpm media:push:prod` (from `apps/portfolio`, with `AWS_PROFILE` set).
6. Deploy: push a change under `apps/portfolio`, or run **Actions → Deploy portfolio → Run workflow**.

## Running Terraform locally

Credentials come from an AWS CLI profile, so no account IDs or role ARNs live in this repo. In `~/.aws/config`, one profile signs in with SSO and a second assumes the `Terraform` role from it:

```ini
[profile portfolio-sso]
sso_session    = portfolio
sso_account_id = <account id>
sso_role_name  = <permission set>
region         = us-east-1

[sso-session portfolio]
sso_start_url           = https://<portal>.awsapps.com/start
sso_region              = us-east-1
sso_registration_scopes = sso:account:access

[profile portfolio-terraform]
role_arn       = arn:aws:iam::<account id>:role/Terraform
source_profile = portfolio-sso
region         = us-east-1
```

Then, per session:

```sh
aws sso login --profile portfolio-sso
export AWS_PROFILE=portfolio-terraform
```

GitHub Actions doesn't use these profiles; it assumes the bootstrap's OIDC roles.

## Database

- Aurora Serverless v2 with a minimum of 0 capacity units: it pauses after 5 idle minutes, so an idle database mostly costs storage. The first connection after a pause waits about 15 seconds.
- It sits in private subnets with no public address. Only resources in the `database_client_security_group_id` security group can connect, so neither a laptop nor GitHub Actions can reach it directly. There is intentionally no laptop access (no public endpoint, tunnel or bastion).
- The password is generated by RDS and kept in Secrets Manager (`database_secret_arn`), never in state or code.
- Deletion protection is on, and a destroy leaves a final snapshot.

## Decisions

- Remote state in S3 with native locking (`use_lockfile = true`); no DynamoDB table.
- Production migrations (`prisma migrate deploy`) run only as an automated one-off task inside AWS, in the VPC with the database client security group, triggered by the deploy pipeline. Never manually from a laptop.
- CI authenticates via GitHub OIDC; no long-lived AWS keys. The `plan` role (read-only) trusts pull requests and pushes to `main`; the `apply` role trusts only jobs in the `production` environment; the `deploy` role trusts `main` and can only sync the site buckets and invalidate CloudFront. Trust matches GitHub's ID-based OIDC subject (`repo:jamesSaporito@<owner id>/System@<repo id>:…`), so if the repository is renamed or moved, update `github_repository` and `github_repository_ids` in `bootstrap/variables.tf` and re-apply.
- Pull requests and pushes to `main` only plan. Applying is always a deliberate step: run the Infra workflow on `main` (or apply locally).
- The database is off by default (`enable_database = false` in `envs/prod`), so applying production for the site doesn't create Aurora. Turn it on when the backend needs it.
- The repository is public, so account-specific values (the state bucket name, role ARNs) live in GitHub variables and a gitignored `backend.hcl`, not in code. Site bucket names come from the domain, so they need no account ID.
- CloudFront must match `docker/nginx.conf.template`: a viewer-request CloudFront Function rewrites clean URLs to `index.html`, and 403/404 from S3 map to `/404.html` with a 404 status.
- The portfolio (`apps/portfolio`) is one `static-site` instance with its own bucket, distribution and certificate. The bucket also holds the site's photos under `media/` (uploaded with `pnpm media:push`), served from the same origin at `/media/*`; site deploys must not delete that prefix.
- Caching: `/_next/static/*` is immutable for a year; HTML and photos stay at the edge for a day, and each deploy invalidates `/*`. Browsers re-check HTML on every visit.
- After any Terraform change, follow the `infracost` skill (`.claude/skills/infracost/SKILL.md`).
