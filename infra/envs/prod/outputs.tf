output "vpc_id" {
  value = one(module.network[*].vpc_id)
}

output "private_subnet_ids" {
  value = one(module.network[*].private_subnet_ids)
}

output "database_endpoint" {
  value = one(module.database[*].endpoint)
}

output "database_port" {
  value = one(module.database[*].port)
}

output "database_name" {
  value = one(module.database[*].database_name)
}

output "database_secret_arn" {
  description = "Secrets Manager secret with the database username and password."
  value       = one(module.database[*].master_user_secret_arn)
}

output "database_client_security_group_id" {
  value = one(module.database[*].client_security_group_id)
}

output "portfolio_bucket" {
  description = "PORTFOLIO_BUCKET, and MEDIA_BUCKET for `pnpm media:push`."
  value       = module.portfolio.bucket
}

output "portfolio_distribution_id" {
  description = "PORTFOLIO_DISTRIBUTION_ID."
  value       = module.portfolio.distribution_id
}

output "portfolio_cloudfront_domain" {
  description = "Target for the www CNAME at the registrar."
  value       = module.portfolio.cloudfront_domain
}

output "portfolio_certificate_validation" {
  description = "CNAME records to add at the registrar for the certificate."
  value       = module.portfolio.certificate_validation_records
}
