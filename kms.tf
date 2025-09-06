# ====================================================================
# KMS KEY FOR TOKEN ENCRYPTION
# ====================================================================
# Military-grade AES-256 encryption for JWT tokens
# Provides defense-in-depth security beyond httpOnly cookies

resource "aws_kms_key" "auth_tokens" {
  description             = "KMS key for encrypting authentication tokens - AES-256"
  deletion_window_in_days = 10
  enable_key_rotation     = true  # Automatic annual key rotation for forward secrecy
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-auth-tokens-kms"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "TokenEncryption"
    Security    = "Critical"
  }
}

resource "aws_kms_alias" "auth_tokens" {
  name          = "alias/${var.project_name}-${var.environment}-auth-tokens"
  target_key_id = aws_kms_key.auth_tokens.key_id
}

# ====================================================================
# KMS KEY POLICY - STRICT ACCESS CONTROL
# ====================================================================
resource "aws_kms_key_policy" "auth_tokens" {
  key_id = aws_kms_key.auth_tokens.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "auth-token-encryption-policy"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Lambda Functions to Encrypt/Decrypt"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.lambda_role.arn
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:EncryptionContext:purpose" = "auth_token"
            "kms:EncryptionContext:environment" = var.environment
          }
        }
      },
      {
        Sid    = "Allow CloudWatch to Decrypt for Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

# ====================================================================
# IAM POLICY FOR LAMBDA FUNCTIONS TO USE KMS
# ====================================================================
resource "aws_iam_policy" "lambda_kms_policy" {
  name        = "${var.project_name}-${var.environment}-lambda-kms-policy"
  description = "Allow Lambda functions to use KMS for token encryption"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey",
          "kms:CreateGrant",
          "kms:RetireGrant"
        ]
        Resource = aws_kms_key.auth_tokens.arn
      }
    ]
  })
}

# Attach KMS policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_kms" {
  policy_arn = aws_iam_policy.lambda_kms_policy.arn
  role       = aws_iam_role.lambda_role.name
}

# ====================================================================
# CLOUDWATCH ALARMS FOR KMS MONITORING
# ====================================================================
resource "aws_cloudwatch_metric_alarm" "kms_key_usage" {
  alarm_name          = "${var.project_name}-${var.environment}-kms-high-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfOperations"
  namespace           = "AWS/KMS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "Alert when KMS key usage is abnormally high"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    KeyId = aws_kms_key.auth_tokens.key_id
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_metric_alarm" "kms_decrypt_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-kms-decrypt-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfDecryptionErrors"
  namespace           = "AWS/KMS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert on KMS decryption errors"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    KeyId = aws_kms_key.auth_tokens.key_id
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

