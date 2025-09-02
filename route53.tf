# Route53 Configuration for Custom Domain
# This enables same-domain authentication by serving both frontend and API from filodelight.online

# Data source for existing hosted zone
data "aws_route53_zone" "main" {
  name         = "filodelight.online"
  private_zone = false
}

# SSL Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = "filodelight.online"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront-certificate"
    Environment = var.environment
    Project     = var.project_name
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
}

# Certificate validation for CloudFront
resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]

  timeouts {
    create = "30m"
  }
}

# SSL Certificate for API Gateway custom domain (regional)
resource "aws_acm_certificate" "api" {
  domain_name       = "source.filodelight.online"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-certificate"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Certificate validation DNS records for API
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
}

# Certificate validation for API
resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]

  timeouts {
    create = "30m"
  }
}

# API Gateway Custom Domain for source.filodelight.online
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = "source.filodelight.online"
  regional_certificate_arn = aws_acm_certificate.api.arn
  endpoint_configuration {
    types = ["REGIONAL"]
  }

  depends_on = [aws_acm_certificate_validation.api]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-domain"
    Environment = var.environment
    Project     = var.project_name
  }
}

# API Gateway Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
}

# DNS Record for root domain (filodelight.online) -> CloudFront
resource "aws_route53_record" "root" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "filodelight.online"
  type    = "A"

  alias {
    name                   = "d1gjet2p4vcoj0.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2" # CloudFront's hosted zone ID (this is always the same for all CloudFront distributions)
    evaluate_target_health = false
  }
}

# DNS Record for API subdomain (source.filodelight.online) -> API Gateway
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "source.filodelight.online"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api.regional_zone_id
    evaluate_target_health = false
  }
}