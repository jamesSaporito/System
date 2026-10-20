# Infra

Terraform for hosting the static site. Placeholder only; not implemented yet.

| Path                   | Purpose                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `bootstrap/`           | One-time, local-state setup: S3 state bucket and the GitHub Actions OIDC provider + IAM role.                      |
| `modules/static-site/` | Private S3 bucket (Origin Access Control), CloudFront distribution, ACM certificate (us-east-1), Route 53 records. |
| `envs/prod/`           | Instantiates `static-site` for production.                                                                         |

## Decisions

- Remote state in S3 with native locking (`use_lockfile = true`); no DynamoDB table.
- CI authenticates via GitHub OIDC; no long-lived AWS keys.
- CloudFront must match `docker/nginx.conf`: a viewer-request CloudFront Function rewrites clean URLs to `index.html`, and 403/404 from S3 map to `/404.html` with a 404 status.
