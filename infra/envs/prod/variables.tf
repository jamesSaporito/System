variable "region" {
  type    = string
  default = "us-east-1"
}

variable "enable_database" {
  description = "Create the VPC and Aurora database for the backend."
  type        = bool
  default     = false
}
