provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Component   = "Frontend Infrastructure"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# Provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Component   = "Frontend Infrastructure"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}