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
