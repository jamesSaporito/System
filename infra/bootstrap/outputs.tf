# Copy these into GitHub (Settings → Secrets and variables → Actions → Variables) and into
# envs/*/backend.hcl. See infra/README.md.

output "state_bucket" {
  description = "TF_STATE_BUCKET: the S3 bucket holding every other stack's state."
  value       = aws_s3_bucket.state.bucket
}

output "plan_role_arn" {
  description = "AWS_PLAN_ROLE_ARN: assumed by plans on pull requests and pushes to main."
  value       = aws_iam_role.github["plan"].arn
}

output "apply_role_arn" {
  description = "AWS_APPLY_ROLE_ARN: assumed by applies in the production environment."
  value       = aws_iam_role.github["apply"].arn
}

output "deploy_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN: assumed by site deploys on main."
  value       = aws_iam_role.github["deploy"].arn
}
