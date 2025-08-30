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