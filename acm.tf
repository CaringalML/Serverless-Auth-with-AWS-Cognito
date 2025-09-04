# ====================================================================
# AWS Certificate Manager (ACM) Configuration
# ====================================================================
# This file manages SSL certificates for both CloudFront (us-east-1) and 
# API Gateway (regional) to enable secure HTTPS communication across the platform.
#
# Certificate Requirements:
# - CloudFront: Must be in us-east-1 region (global edge requirement)
# - API Gateway: Regional certificate in the same region as API Gateway
# 
# Security Benefits:
# - End-to-end HTTPS encryption for all traffic
# - Automatic certificate renewal by AWS
# - DNS validation for domain ownership verification
# ====================================================================

# SSL Certificate for CloudFront Distribution (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = var.root_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront-certificate"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "CloudFront SSL Certificate"
    Region      = "us-east-1"
  }
}

# Certificate validation DNS records for CloudFront
resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id

  depends_on = [aws_acm_certificate.cloudfront]
}

# Certificate validation for CloudFront (us-east-1)
resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]

  timeouts {
    create = "30m"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# SSL Certificate for API Gateway Custom Domain (regional)
resource "aws_acm_certificate" "api" {
  domain_name       = "${var.api_subdomain}.${var.root_domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-certificate"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "API Gateway SSL Certificate"
    Region      = var.aws_region
  }
}

# Certificate validation DNS records for API Gateway
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id

  depends_on = [aws_acm_certificate.api]
}

# Certificate validation for API Gateway (regional)
resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]

  timeouts {
    create = "30m"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# All outputs are centralized in outputs.tf