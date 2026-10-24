variable "domain" {
  description = "Primary domain; the certificate's main name (e.g. example.com)."
  type        = string
}

variable "aliases" {
  description = "Every hostname the site answers on, including `domain` (e.g. example.com and www.example.com)."
  type        = list(string)
}

variable "bucket_name" {
  description = "S3 bucket holding the static export and the site's photos under media/."
  type        = string
}

variable "attach_domain" {
  description = "Serve the aliases with the ACM certificate. Leave false until the validation records exist in DNS, or the apply waits on validation."
  type        = bool
  default     = false
}

variable "noncurrent_version_days" {
  description = "Days to keep overwritten or deleted object versions before they expire."
  type        = number
  default     = 30
}
