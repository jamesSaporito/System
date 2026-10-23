# Workflows

Planned; not implemented yet.

| Workflow          | Trigger                         | Does                                                                     |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------ |
| CI                | Pull requests                   | `pnpm install`, `lint`, `typecheck`, `build`                             |
| Deploy public     | Push to `main`                  | Build static export, sync `apps/public/out` to S3, invalidate CloudFront |
| Infra             | PRs / push to `main` (`infra/`) | `terraform plan` on PRs, `apply` on `main`                               |
| Scheduled rebuild | Cron                            | Rebuild and deploy to refresh content pulled from GitHub                 |

All AWS access uses the GitHub OIDC role from `infra/bootstrap`.
