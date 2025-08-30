# GitHub Actions CI/CD Setup

## Required GitHub Secrets

Before the GitHub Actions workflow can run, you need to configure the following secrets in your repository:

### AWS Credentials
- `AWS_ACCESS_KEY_ID` - AWS IAM user access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM user secret key

### Terraform State
- `TF_STATE_BUCKET` - S3 bucket name for Terraform state storage

## Setting up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each required secret

## Creating Terraform State Bucket

Before first deployment, create an S3 bucket for Terraform state:

```bash
aws s3api create-bucket \
  --bucket your-terraform-state-bucket \
  --region ap-southeast-2 \
  --create-bucket-configuration LocationConstraint=ap-southeast-2

aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket your-terraform-state-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

## Optional: DynamoDB Table for State Locking

```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ap-southeast-2
```

## Workflow Triggers

The deployment workflow runs on:
- Push to `main` branch (deploys to dev environment)
- Push to `production` branch (deploys to prod environment)
- Pull requests to `main` (validation only)
- Manual trigger via workflow_dispatch

## Deployment Environments

- **Development**: Triggered by pushes to `main` branch
- **Production**: Triggered by pushes to `production` branch

## Workflow Jobs

1. **terraform-validate**: Validates Terraform configuration
2. **deploy-infrastructure**: Deploys AWS infrastructure using Terraform
3. **build-frontend**: Builds React application with production API URL
4. **deploy-frontend**: Deploys frontend to S3 static hosting
5. **integration-tests**: Runs health checks on deployed API endpoints

## Manual Deployment

You can also trigger deployment manually:
1. Go to Actions tab in your repository
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"