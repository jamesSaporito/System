# Workflows

CI is planned; the others exist.

| Workflow                                  | Trigger                                                 | Does                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| CI (planned)                              | Pull requests                                           | `pnpm install`, `lint`, `typecheck`, `build`                                                                 |
| Deploy portfolio (`deploy-portfolio.yml`) | Push to `main` (`apps/portfolio/`, `packages/`), manual | Build the static export, sync `apps/portfolio/out` to S3, invalidate CloudFront                              |
| Infra (`infra.yml`)                       | PRs / push to `main` (`infra/`), manual                 | `terraform plan` (job summary); `apply` only via **Run workflow** on `main`, in the `production` environment |

The site sync must use `--exclude "media/*"` so deploys never delete photos (they're uploaded separately with `pnpm media:push`).

All AWS access uses the GitHub OIDC roles from `infra/bootstrap`; see `infra/README.md` for the repository variables and environment they need.
