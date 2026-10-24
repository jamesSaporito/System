variable "name" {
  description = "Name prefix for the VPC and its resources."
  type        = string
}

variable "cidr_block" {
  description = "VPC address range; each subnet takes a /24 of it."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones (and private subnets) to span."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "Aurora needs subnets in at least two availability zones."
  }
}
