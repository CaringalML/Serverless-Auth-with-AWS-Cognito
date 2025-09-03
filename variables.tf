variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "serverless-auth"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Domain Configuration Variables
variable "root_domain" {
  description = "Root domain for the application"
  type        = string
  default     = "filodelight.online"
}

variable "api_subdomain" {
  description = "Subdomain for API Gateway"
  type        = string
  default     = "api"
}

# API Gateway Variables
variable "api_gateway_name" {
  description = "Name for the API Gateway"
  type        = string
  default     = "Authentication API"
}

variable "api_gateway_description" {
  description = "Description for the API Gateway"
  type        = string
  default     = "Serverless Authentication API with Cognito integration"
}

variable "api_gateway_endpoint_type" {
  description = "API Gateway endpoint configuration type"
  type        = string
  default     = "REGIONAL"
  validation {
    condition     = contains(["EDGE", "REGIONAL", "PRIVATE"], var.api_gateway_endpoint_type)
    error_message = "API Gateway endpoint type must be EDGE, REGIONAL, or PRIVATE."
  }
}

# CORS Configuration Variables
variable "cors_allow_origin" {
  description = "CORS allow origin header value. Must be specific origin when using credentials (not *)"
  type        = string
  default     = "https://filodelight.online"
}

variable "cors_allow_headers" {
  description = "CORS allow headers"
  type        = string
  default     = "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
}

variable "cors_allow_methods" {
  description = "CORS allow methods"
  type        = string
  default     = "GET,OPTIONS,POST,PUT,DELETE"
}

variable "cors_allow_credentials" {
  description = "CORS allow credentials for cookie support"
  type        = bool
  default     = true
}

variable "cors_max_age" {
  description = "CORS max age in seconds"
  type        = number
  default     = 86400
}

# API Gateway Stage Variables
variable "api_stage_name" {
  description = "API Gateway deployment stage name"
  type        = string
  default     = null # Will use var.environment if not set
}

variable "api_stage_description" {
  description = "Description for the API Gateway stage"
  type        = string
  default     = "API Gateway stage for authentication endpoints"
}

# API Gateway Throttling
variable "api_throttle_rate_limit" {
  description = "API Gateway default throttle rate limit (requests per second) for non-auth endpoints"
  type        = number
  default     = 100  # Reduced from 2000 to prevent abuse
}

variable "api_throttle_burst_limit" {
  description = "API Gateway default throttle burst limit for non-auth endpoints"
  type        = number
  default     = 200  # Reduced from 5000 to prevent abuse
}

# API Gateway Logging
variable "api_gateway_logging_enabled" {
  description = "Enable API Gateway logging"
  type        = bool
  default     = true
}

variable "api_gateway_log_level" {
  description = "API Gateway log level"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["OFF", "ERROR", "INFO"], var.api_gateway_log_level)
    error_message = "API Gateway log level must be OFF, ERROR, or INFO."
  }
}

variable "api_gateway_data_trace_enabled" {
  description = "Enable API Gateway data trace logging"
  type        = bool
  default     = false
}

variable "api_gateway_metrics_enabled" {
  description = "Enable detailed CloudWatch metrics for API Gateway"
  type        = bool
  default     = true
}

# Alert Configuration Variables
variable "security_alert_email" {
  description = "Email address for security alerts"
  type        = string
  sensitive   = true
}

variable "system_alert_email" {
  description = "Email address for system alerts"
  type        = string
  sensitive   = true
}

# Destroy Protection Variables
variable "skip_destroy_cloudwatch_logs" {
  description = "Skip destroying CloudWatch log groups on terraform destroy"
  type        = bool
  default     = false
}

variable "skip_destroy_dynamodb" {
  description = "Skip destroying DynamoDB tables on terraform destroy"
  type        = bool
  default     = false
}

variable "prevent_destroy_resources" {
  description = "Prevent accidental destruction of all resources and enable zero-downtime deployments (enable for production)"
  type        = bool
  default     = false
}

# Frontend Infrastructure Variables
variable "s3_bucket_name" {
  description = "Name of the S3 bucket storing React build artifacts"
  type        = string
  default     = "react-artifact"
  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.s3_bucket_name)) && length(var.s3_bucket_name) >= 3 && length(var.s3_bucket_name) <= 63
    error_message = "S3 bucket name must be 3-63 characters, lowercase letters, numbers, dots, and hyphens only."
  }
}

variable "oac_name" {
  description = "Name for the CloudFront Origin Access Control securing S3 access"
  type        = string
  default     = "react-artifact-oac"
}

variable "function_name" {
  description = "Name for the CloudFront Function handling React Router SPA routing"
  type        = string
  default     = "Serverless-Auth-Cognito-function"
}

variable "distribution_name" {
  description = "Name for the CloudFront distribution serving the React application"
  type        = string
  default     = "Serverless-Auth-Cognito-distribution"
}

variable "origin_id" {
  description = "Origin ID for the S3 bucket in CloudFront distribution"
  type        = string
  default     = "S3-React"
}

variable "react_app_path" {
  description = "Path to the React build artifacts within the S3 bucket"
  type        = string
  default     = "/react-build"
  validation {
    condition     = can(regex("^/[a-zA-Z0-9_-]+", var.react_app_path))
    error_message = "React app path must start with '/' and contain valid characters."
  }
}

variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "cloudfront_ttl" {
  description = "CloudFront distribution TTL cache settings in seconds"
  type = object({
    min     = number
    default = number
    max     = number
  })
  default = {
    min     = 0
    default = 3600
    max     = 86400
  }
  validation {
    condition     = var.cloudfront_ttl.min >= 0 && var.cloudfront_ttl.default >= var.cloudfront_ttl.min && var.cloudfront_ttl.max >= var.cloudfront_ttl.default
    error_message = "TTL values must be: min >= 0, default >= min, max >= default."
  }
}

variable "cloudfront_allowed_methods" {
  description = "HTTP methods allowed by CloudFront"
  type        = list(string)
  default     = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
}

variable "cloudfront_cached_methods" {
  description = "HTTP methods cached by CloudFront"
  type        = list(string)
  default     = ["GET", "HEAD"]
  validation {
    condition     = alltrue([for method in var.cloudfront_cached_methods : contains(["GET", "HEAD"], method)])
    error_message = "Only GET and HEAD methods should be cached for optimal performance."
  }
}

variable "forwarded_headers" {
  description = "Headers forwarded to origin for API communication"
  type        = list(string)
  default     = ["Origin", "Authorization", "Content-Type", "Accept"]
}

variable "error_responses" {
  description = "Custom error responses for React SPA routing"
  type = list(object({
    error_code         = number
    response_code      = number
    response_page_path = string
  }))
  default = [
    {
      error_code         = 403
      response_code      = 200
      response_page_path = "/index.html"
    },
    {
      error_code         = 404
      response_code      = 200
      response_page_path = "/index.html"
    }
  ]
}

variable "cors_max_age_seconds" {
  description = "Maximum time in seconds that browsers can cache CORS preflight responses"
  type        = number
  default     = 3600
  validation {
    condition     = var.cors_max_age_seconds >= 0 && var.cors_max_age_seconds <= 86400
    error_message = "CORS max age must be between 0 and 86400 seconds (24 hours)."
  }
}

variable "tags" {
  description = "Common tags applied to all infrastructure resources"
  type        = map(string)
  default = {
    Project     = "Serverless-Auth-Cognito"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Component   = "Full Stack Infrastructure"
    Owner       = "Martin Caringal"
  }
}

variable "force_destroy" {
  description = "Allow S3 bucket deletion even with objects"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable S3 bucket versioning for React build artifacts"
  type        = bool
  default     = false
}

variable "cloudfront_function_runtime" {
  description = "JavaScript runtime version for CloudFront Functions"
  type        = string
  default     = "cloudfront-js-1.0"
  validation {
    condition     = contains(["cloudfront-js-1.0"], var.cloudfront_function_runtime)
    error_message = "CloudFront function runtime must be 'cloudfront-js-1.0'."
  }
}

# Google OAuth Configuration Variables
variable "google_client_id" {
  description = "Google OAuth 2.0 Client ID for Cognito integration"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 Client Secret for Cognito integration"
  type        = string
  sensitive   = true
}