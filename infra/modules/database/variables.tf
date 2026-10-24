variable "name" {
  description = "Identifier for the cluster and its related resources."
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnets in at least two availability zones."
  type        = list(string)
}

variable "engine_version" {
  description = "Aurora PostgreSQL version; matches local development (Postgres 18.6)."
  type        = string
  default     = "18.6"
}

variable "database_name" {
  type    = string
  default = "portfolio"
}

variable "master_username" {
  type    = string
  default = "portfolio"
}

variable "max_capacity" {
  description = "Upper scaling limit in Aurora capacity units (1 ACU ≈ 2 GB memory)."
  type        = number
  default     = 1
}

variable "seconds_until_auto_pause" {
  description = "Idle time before the database pauses (300–86400)."
  type        = number
  default     = 300
}

variable "backup_retention_days" {
  type    = number
  default = 7
}
