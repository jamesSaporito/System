terraform {
  required_version = "~> 1.17"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.70"
    }
  }

  # The bucket comes from `terraform init -backend-config=backend.hcl` locally, or the
  # TF_STATE_BUCKET repository variable in CI, so the account-specific name stays out of git.
  backend "s3" {
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "portfolio"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}
