output "bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain" {
  description = "Target for the www CNAME at the registrar."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "certificate_validation_records" {
  description = "CNAME records to add at the registrar so ACM can issue the certificate."
  value = {
    for o in aws_acm_certificate.site.domain_validation_options : o.domain_name => {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  }
}
