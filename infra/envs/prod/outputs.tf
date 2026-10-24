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

output "site_james_bucket" {
  description = "SITE_JAMES_BUCKET, and MEDIA_BUCKET for `pnpm media:push`."
  value       = module.site_james.bucket
}

output "site_james_distribution_id" {
  description = "SITE_JAMES_DISTRIBUTION_ID."
  value       = module.site_james.distribution_id
}

output "site_james_cloudfront_domain" {
  description = "Target for the www CNAME at the registrar."
  value       = module.site_james.cloudfront_domain
}

output "site_james_certificate_validation" {
  description = "CNAME records to add at the registrar for the certificate."
  value       = module.site_james.certificate_validation_records
}
