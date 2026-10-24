# Workflows

Planned; not implemented yet.

| Workflow     | Trigger                         | Does                                                                      |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| CI           | Pull requests                   | `pnpm install`, `lint`, `typecheck`, `build`                              |
| Deploy sites | Push to `main`                  | Build static export, sync `sites/<slug>/out` to S3, invalidate CloudFront |
| Infra        | PRs / push to `main` (`infra/`) | `terraform plan` on PRs, `apply` on `main`                                |

The site sync must use `--exclude "media/*"` so deploys never delete photos (they're uploaded separately with `pnpm media:push`).

All AWS access uses the GitHub OIDC role from `infra/bootstrap`.
