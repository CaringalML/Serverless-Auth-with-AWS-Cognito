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
  default     = "https://d1gjet2p4vcoj0.cloudfront.net"
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
  description = "API Gateway throttle rate limit (requests per second)"
  type        = number
  default     = 2000
}

variable "api_throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 5000
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
  default     = "lawrencecaringal5@gmail.com"
  sensitive   = true
}

variable "system_alert_email" {
  description = "Email address for system alerts"
  type        = string
  default     = "lawrencecaringal5@gmail.com"
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