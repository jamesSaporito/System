variable "region" {
  description = "AWS region for the state bucket (and the default for every stack)."
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the CI roles, as owner/name."
  type        = string
  default     = "jamesSaporito/System"
}

# GitHub's OIDC subject names the repository as owner@<id>/name@<id>, so a deleted and re-created
# repository or account with the same name can't assume the roles. Both IDs are public:
# https://api.github.com/repos/<owner>/<name> (`owner.id` and `id`).
variable "github_repository_ids" {
  description = "Numeric GitHub IDs of the repository's owner and of the repository itself."
  type = object({
    owner      = number
    repository = number
  })
  default = {
    owner      = 12115596
    repository = 1431589779
  }
}

variable "site_buckets" {
  description = "Site buckets (envs/prod static-site modules) the deploy role may sync to."
  type        = list(string)
  default     = ["jamessaporito-com-site"]
}
