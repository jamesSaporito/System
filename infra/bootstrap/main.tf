data "aws_caller_identity" "current" {}

locals {
  # Bucket names are global; the account ID keeps this one unique.
  state_bucket = "portfolio-tfstate-${data.aws_caller_identity.current.account_id}"
  github_oidc  = "token.actions.githubusercontent.com"

  # OIDC subject prefix, e.g. repo:owner@123/name@456 (see var.github_repository_ids).
  github_subject = format(
    "repo:%s@%d/%s@%d",
    split("/", var.github_repository)[0], var.github_repository_ids.owner,
    split("/", var.github_repository)[1], var.github_repository_ids.repository,
  )
}

# --- Terraform state ---------------------------------------------------------------------------

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket

  lifecycle {
    prevent_destroy = true
  }
}

# Versioning keeps every past state file, so a bad apply can be rolled back.
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "state_bucket" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.state.arn,
      "${aws_s3_bucket.state.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = data.aws_iam_policy_document.state_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.state]
}

# --- GitHub Actions (OIDC, no stored AWS keys) ---------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://${local.github_oidc}"
  client_id_list = ["sts.amazonaws.com"]
}

# Who may assume a role: only workflows in this repository, narrowed further by `subject`.
data "aws_iam_policy_document" "github_trust" {
  for_each = {
    # Read-only plans: pull requests and pushes to main.
    plan = [
      "${local.github_subject}:pull_request",
      "${local.github_subject}:ref:refs/heads/main",
    ]
    # Jobs that run in the `production` GitHub environment: manual applies on main.
    apply = ["${local.github_subject}:environment:production"]
    # Site deploys: pushes to main and manual runs from main.
    deploy = ["${local.github_subject}:ref:refs/heads/main"]
  }

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_oidc}:sub"
      values   = each.value
    }
  }
}

resource "aws_iam_role" "github" {
  for_each = data.aws_iam_policy_document.github_trust

  name               = "portfolio-github-${each.key}"
  assume_role_policy = each.value.json
}

# Plans read everything but change nothing (ReadOnlyAccess can't read secret values).
resource "aws_iam_role_policy_attachment" "plan_read_only" {
  role       = aws_iam_role.github["plan"].name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Applies manage whatever the stacks define; narrow this once the set of services settles.
resource "aws_iam_role_policy_attachment" "apply_admin" {
  role       = aws_iam_role.github["apply"].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Plan and apply read and write state, including the lock file Terraform creates during a plan.
data "aws_iam_policy_document" "state_access" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.state.arn]
  }

  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.state.arn}/*"]
  }
}

resource "aws_iam_role_policy" "state_access" {
  for_each = { for k, r in aws_iam_role.github : k => r if k != "deploy" }

  name   = "terraform-state"
  role   = each.value.id
  policy = data.aws_iam_policy_document.state_access.json
}

# Deploys sync a site's build into its bucket and clear the CloudFront cache; nothing else.
data "aws_iam_policy_document" "deploy" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [for b in var.site_buckets : "arn:aws:s3:::${b}"]
  }

  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [for b in var.site_buckets : "arn:aws:s3:::${b}/*"]
  }

  statement {
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "site-deploy"
  role   = aws_iam_role.github["deploy"].id
  policy = data.aws_iam_policy_document.deploy.json
}
