# Content

MDX content rendered at build time by `apps/web`.

## Projects

`projects/<slug>.mdx`. The filename is the URL slug (`/projects/<slug>/`).

| Field     | Type     | Required | Notes                              |
| --------- | -------- | -------- | ---------------------------------- |
| `title`   | string   | yes      |                                    |
| `summary` | string   | yes      | Used in lists and meta description |
| `date`    | string   | yes      | `YYYY-MM-DD`, sorts newest first   |
| `tags`    | string[] | no       |                                    |

Invalid frontmatter fails the build.
