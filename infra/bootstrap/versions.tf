terraform {
  required_version = "~> 1.17"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.70"
    }
  }

  # Local state on purpose: this stack creates the bucket every other stack stores its state in.
  # terraform.tfstate is gitignored; if it's ever lost, re-import the resources below.
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "portfolio"
      Stack     = "bootstrap"
      ManagedBy = "terraform"
    }
  }
}
