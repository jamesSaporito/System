# One static site (`sites/<slug>` export) behind CloudFront. Behavior mirrors
# docker/nginx.conf.template: clean URLs resolve to index.html without redirects, missing paths
# return /404.html with a 404 status, and photos are served from the same bucket at /media/.
#
# CloudFront only accepts ACM certificates from us-east-1, so the calling provider must use it.

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# --- Bucket ------------------------------------------------------------------------------------

# Not force_destroy: a bucket that still holds files (including photos) can't be deleted by accident.
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning lets a deleted photo or a bad deploy be recovered; old versions expire on their own.
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_days
    }

    expiration {
      expired_object_delete_marker = true
    }
  }

  depends_on = [aws_s3_bucket_versioning.site]
}

# Only this distribution may read the bucket (Origin Access Control); nothing is public.
data "aws_iam_policy_document" "site_bucket" {
  statement {
    sid       = "CloudFrontRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }

  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.site.arn,
      "${aws_s3_bucket.site.arn}/*",
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

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.site]
}

# --- Certificate -------------------------------------------------------------------------------

# Validated by DNS records added at the registrar (see the certificate_validation_records output).
resource "aws_acm_certificate" "site" {
  domain_name               = var.domain
  subject_alternative_names = [for a in var.aliases : a if a != var.domain]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until the certificate is issued, so only created once the records are in DNS.
resource "aws_acm_certificate_validation" "site" {
  count = var.attach_domain ? 1 : 0

  certificate_arn = aws_acm_certificate.site.arn
}

# --- CloudFront --------------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = var.bucket_name
  description                       = "Signed requests from CloudFront to ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# `/nixie/` and `/nixie` both serve `/nixie/index.html` (nginx: try_files $uri $uri/index.html).
resource "aws_cloudfront_function" "rewrite" {
  name    = "${replace(var.bucket_name, ".", "-")}-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Map clean URLs to index.html"
  publish = true
  code    = file("${path.module}/rewrite.js")
}

# HTML and photos: kept at the edge for a day regardless of the browser-facing Cache-Control
# (deploys set max-age=0 on HTML so browsers re-check), and cleared by each deploy's invalidation.
resource "aws_cloudfront_cache_policy" "site" {
  name        = "${replace(var.bucket_name, ".", "-")}-default"
  min_ttl     = 86400
  default_ttl = 86400
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# Hashed build assets never change, so they follow the long Cache-Control set at deploy.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  comment             = var.domain
  aliases             = var.attach_domain ? var.aliases : []
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.site.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # Without s3:ListBucket, S3 answers a missing key with 403; both become the site's 404 page.
  dynamic "custom_error_response" {
    for_each = [403, 404]

    content {
      error_code            = custom_error_response.value
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 60
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !var.attach_domain
    acm_certificate_arn            = var.attach_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    ssl_support_method             = var.attach_domain ? "sni-only" : null
    minimum_protocol_version       = var.attach_domain ? "TLSv1.2_2021" : "TLSv1"
  }
}
