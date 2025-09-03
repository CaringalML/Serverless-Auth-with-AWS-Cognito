# 🔐 Serverless Authentication System with AWS Cognito

[![Security Grade](https://img.shields.io/badge/Security%20Grade-A%2B-brightgreen)](https://github.com/yourusername/Serverless-Auth-Cognito)
[![AWS](https://img.shields.io/badge/AWS-Certified-orange)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/Terraform-1.5%2B-purple)](https://terraform.io)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org)

A production-ready, enterprise-grade serverless authentication system built on AWS, featuring **100% httpOnly cookie security**, comprehensive rate limiting, and Google OAuth integration.

## 🌟 Why This Authentication System?

### The Problem with Traditional Auth Providers

While services like Auth0, Firebase Auth, and Okta are excellent, they come with limitations:

1. **Vendor Lock-in**: Your entire auth system depends on a third party
2. **Cost at Scale**: Pricing can become expensive with growth (Auth0: $23-$240/1000 MAU)
3. **Limited Customization**: Constrained by provider's features and UI
4. **Data Sovereignty**: User data stored on third-party servers
5. **Compliance Challenges**: Difficult to meet specific regulatory requirements
6. **Performance**: Additional network hop to external services

### Our Solution Advantages

✅ **Full Control**: Complete ownership of your authentication infrastructure  
✅ **Cost-Effective**: Pay only for AWS resources used (~$5-20/month for most startups)  
✅ **Infinitely Customizable**: Modify any aspect of the auth flow  
✅ **Data Sovereignty**: User data stays in your AWS account  
✅ **Compliance Ready**: Built to meet GDPR, HIPAA, SOC2 requirements  
✅ **Performance**: Direct integration with your infrastructure  
✅ **No Vendor Lock-in**: Standard AWS services, easily portable  

### Security-First Design

- 🔒 **100% HttpOnly Cookies**: Tokens never exposed to JavaScript (XSS immune)
- 🛡️ **CSRF Protection**: SameSite=Strict cookies prevent cross-site attacks
- 🚦 **Rate Limiting**: Per-endpoint throttling prevents brute force
- 🔑 **Secure Password Storage**: Cryptographically secure random passwords
- 📊 **Security Monitoring**: Real-time alerts for suspicious activity

## 🏗️ Infrastructure Architecture

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[User Browser] -->|HTTPS| B[CloudFront CDN]
        B --> C[S3 Static Site]
    end
    
    subgraph "API Gateway"
        D[API Gateway] -->|Rate Limiting| E[Lambda Authorizer]
        D --> F[Auth Endpoints]
    end
    
    subgraph "Authentication Layer"
        F --> G[Sign Up Lambda]
        F --> H[Sign In Lambda]
        F --> I[Google OAuth Lambda]
        F --> J[Token Refresh Lambda]
        F --> K[Password Reset Lambda]
    end
    
    subgraph "AWS Services"
        G --> L[AWS Cognito]
        H --> L
        I --> L
        J --> L
        K --> L
        L --> M[DynamoDB Users Table]
        G --> N[CloudWatch Logs]
        H --> N
        I --> N
    end
    
    subgraph "Security Layer"
        O[WAF Rules] --> D
        P[CloudWatch Alarms] --> Q[SNS Alerts]
        N --> P
    end
    
    A -->|httpOnly Cookies| D
    L -->|JWT Tokens| A
    
    style A fill:#e1f5fe
    style L fill:#fff3e0
    style D fill:#f3e5f5
    style O fill:#ffebee
```

## 🚀 Quick Start

### Prerequisites

- AWS Account with appropriate permissions
- Terraform >= 1.5.0
- Node.js >= 18.0.0
- Python >= 3.9
- AWS CLI configured
- Google OAuth credentials (for Google sign-in)

### 1️⃣ Clone and Configure

```bash
# Clone the repository
git clone https://github.com/yourusername/Serverless-Auth-Cognito.git
cd Serverless-Auth-Cognito

# Copy and configure Terraform variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
```

### 2️⃣ Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Deploy the infrastructure
terraform apply

# Note the output values for frontend configuration
```

### 3️⃣ Configure Frontend

```bash
cd frontend-auth

# Install dependencies
npm install

# Create environment file
cat > .env.production << EOF
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_FRONTEND_URL=https://yourdomain.com
EOF

# Build the frontend
npm run build

# Deploy to S3 (using output from Terraform)
aws s3 sync build/ s3://your-frontend-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### 4️⃣ Test the System

1. Navigate to `https://yourdomain.com`
2. Create a test account
3. Verify email
4. Test sign in/out
5. Test Google OAuth
6. Monitor CloudWatch dashboards

## 🔒 Security Features

### HttpOnly Cookie Authentication
- **Zero JavaScript Token Access**: Complete XSS immunity
- **Automatic Token Management**: Browser handles auth seamlessly
- **Secure by Default**: HTTPS-only, SameSite=Strict

### Rate Limiting (Per Endpoint)
| Endpoint | Rate Limit | Burst | Purpose |
|----------|-----------|--------|---------|
| Sign In | 5/sec | 10 | Prevent brute force |
| Sign Up | 2/sec | 5 | Prevent bot registration |
| Forgot Password | 1/sec | 3 | Prevent email bombing |
| Verification | 3/sec | 6 | Prevent code guessing |
| Google OAuth | 10/sec | 20 | Normal OAuth flow |

### Security Monitoring
- Failed login tracking
- Geographic anomaly detection
- IP-based blocking
- Real-time security alerts
- Comprehensive audit logs

## 💰 Cost Analysis

### Estimated Monthly Costs (1000 active users)

| Service | Usage | Cost |
|---------|-------|------|
| Cognito | 1000 MAU | $0.00 (free tier) |
| Lambda | 50k invocations | $1.00 |
| API Gateway | 100k calls | $3.50 |
| DynamoDB | 1GB storage | $0.25 |
| CloudWatch | Logs & metrics | $5.00 |
| CloudFront | 10GB transfer | $0.85 |
| **Total** | | **~$10.60** |

### Cost Comparison

| Provider | 1000 MAU | 10,000 MAU | 100,000 MAU |
|----------|----------|------------|-------------|
| **This System** | $10 | $50 | $400 |
| Auth0 | $23 | $230 | $2,300 |
| Firebase | $0 | $0 | $250+ |
| Okta | $200+ | $2,000+ | Custom |

## 📊 CloudWatch Dashboards & Monitoring

### Dashboard URLs (After Deployment)

- **Security Overview**: Monitor failed logins, suspicious activity, security alerts
- **User Activity**: Track user engagement, session analytics, business metrics
- **System Health**: Monitor system performance, errors, infrastructure health

### Key Metrics Monitored

**Security Metrics**:
- Failed login attempts (last 24 hours)
- Active sessions count
- Top failed login IP addresses
- Recent security alerts
- Inactivity logouts by IP

**Business Metrics**:
- Daily active users
- New signups today
- Page views by route
- Average session duration
- API response times

**System Metrics**:
- Lambda invocations by function
- Lambda errors and duration
- API Gateway metrics (4XX, 5XX, latency)
- Token refresh success rate
- Recent system errors

### Alert Configuration

Critical alerts configured for:
- 🔴 **Security**: 5+ failed attempts from same IP in 10 minutes
- 🟡 **System**: 100+ 4XX errors in 5 minutes
- 🟢 **Business**: Daily signups drop below threshold

### Useful CloudWatch Insights Queries

**Failed Login Analysis**
```sql
fields @timestamp, ipAddress, details.email
| filter success = false
| stats count() by ipAddress
| sort count desc
| limit 50
```

**User Activity Timeline**
```sql
fields @timestamp, action, userId, ipAddress, details.page
| filter action = "USER_ACTIVE"
| sort @timestamp desc
| limit 100
```

**Security Events Dashboard**
```sql
fields @timestamp, event, severity, ipAddress, details
| filter severity in ["high", "critical"]
| sort @timestamp desc
| limit 25
```

## 🛠️ Tech Stack

### Backend
- **AWS Cognito**: User pools and authentication
- **AWS Lambda**: Serverless compute (Python 3.9)
- **API Gateway**: REST API with rate limiting
- **DynamoDB**: User data storage
- **CloudWatch**: Logging and monitoring
- **SNS**: Email alerts

### Frontend
- **React 18.2**: Modern UI framework
- **Redux Toolkit**: State management
- **Tailwind CSS**: Utility-first styling
- **Axios**: HTTP client with interceptors

### Infrastructure
- **Terraform**: Infrastructure as Code
- **CloudFront**: CDN for global distribution
- **S3**: Static website hosting

## 📁 Project Structure

```
├── api_gateway.tf          # API Gateway configuration with rate limiting
├── cognito.tf              # Cognito user pool setup
├── lambda.tf               # Lambda function definitions
├── dynamodb.tf             # DynamoDB tables
├── cloudwatch_dashboards.tf # Monitoring dashboards
├── iam.tf                  # IAM roles and policies
├── lambda_functions/       # Lambda function code
│   ├── signin/            
│   ├── signup/            
│   ├── google_auth/       # Google OAuth handler
│   ├── refresh/           
│   └── utils/             # Shared utilities
├── frontend-auth/          # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── store/         # Redux store
│   └── package.json
└── terraform.tfvars.example # Configuration template
```

## 🔧 Configuration

### Required Terraform Variables

```hcl
# terraform.tfvars
project_name     = "myapp"
environment      = "production"
aws_region       = "us-east-1"
root_domain      = "yourdomain.com"
api_subdomain    = "api"

# Google OAuth
google_client_id     = "your-google-client-id"
google_client_secret = "your-google-client-secret"

# Monitoring
security_email = "security@yourdomain.com"
system_email   = "ops@yourdomain.com"
```

### Environment Variables

Frontend `.env.production`:
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_FRONTEND_URL=https://yourdomain.com
```

## 🚨 Security Best Practices

1. **Never expose tokens**: All tokens stored in httpOnly cookies
2. **Use HTTPS everywhere**: Enforce SSL/TLS for all communications
3. **Rotate secrets regularly**: Update Google OAuth secrets periodically
4. **Monitor suspicious activity**: Review CloudWatch dashboards daily
5. **Keep dependencies updated**: Regular security patches
6. **Implement least privilege**: Minimal IAM permissions
7. **Enable MFA**: For AWS console access
8. **Backup user data**: Regular DynamoDB backups

## 🚢 CI/CD Pipeline (GitHub Actions)

The project includes a comprehensive CI/CD pipeline that automatically validates, builds, and deploys your application on every push to the `google-OAuth` branch.

### Pipeline Workflow

```yaml
Trigger: Push to google-OAuth branch
    ↓
1. Terraform Validate
    - Format check
    - Init & validate configuration
    ↓
2. Build & Test
    - Node.js 20.x setup
    - Install dependencies
    - Build React application
    ↓
3. Deploy
    - Upload to S3 bucket
    - Invalidate CloudFront cache
```

### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets → Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJal...` |
| `REACT_APP_API_URL` | API Gateway endpoint | `https://api.yourdomain.com` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `E1234567890ABC` |

### GitHub Actions Configuration

The pipeline is defined in `.github/workflows/aws-deploy.yml` with:
- **Terraform validation** for infrastructure code quality
- **Node.js build** for React application
- **Automatic S3 deployment** with cache invalidation
- **Environment-specific** configuration support

### Setting Up CI/CD

1. **Create IAM User for GitHub Actions**:
```bash
aws iam create-user --user-name github-actions-deploy
aws iam attach-user-policy --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-user-policy --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess
```

2. **Generate Access Keys**:
```bash
aws iam create-access-key --user-name github-actions-deploy
```

3. **Add Secrets to GitHub**:
   - Go to repository Settings → Secrets → Actions
   - Add the four required secrets listed above

4. **Update S3 Bucket Name** in workflow if needed:
   - Edit `.github/workflows/aws-deploy.yml` line 78
   - Replace with your actual S3 bucket name

### Manual Deployment Option

If you prefer manual deployment over CI/CD:

```bash
# Build locally
cd frontend-auth
npm run build

# Deploy to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## 🏢 Production Deployment Checklist

- [ ] Configure custom domain with SSL certificate
- [ ] Set up Google OAuth application
- [ ] Configure SNS email subscriptions
- [ ] Review and adjust rate limiting thresholds
- [ ] Enable CloudWatch alarms
- [ ] Configure backup strategy for DynamoDB
- [ ] Set appropriate log retention periods
- [ ] Review IAM permissions (least privilege)
- [ ] Enable AWS CloudTrail for audit logging
- [ ] Configure CORS for your domain
- [ ] Set up GitHub Actions secrets for CI/CD
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common operations

## 🧪 Testing

### Unit Tests
```bash
# Backend tests
cd lambda_functions
python -m pytest tests/

# Frontend tests
cd frontend-auth
npm test
```

### Integration Tests
```bash
# Run integration test suite
npm run test:integration
```

### Security Testing
- OWASP ZAP for vulnerability scanning
- Burp Suite for penetration testing
- AWS Security Hub for compliance checking

## 📈 Performance Optimization

- **Lambda Cold Starts**: Provisioned concurrency for critical functions
- **API Gateway Caching**: Cache GET responses where appropriate
- **CloudFront**: Global edge locations for low latency
- **DynamoDB**: Auto-scaling configured for traffic spikes
- **Bundle Optimization**: Code splitting and lazy loading in React

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Install dependencies
npm install
cd lambda_layer && pip install -r requirements.txt

# Run local development
npm start

# Run tests
npm test
python -m pytest lambda_functions/tests/
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@yourdomain.com
- 💬 Slack: [Join our community](https://slack.yourdomain.com)
- 📖 Documentation: [Full docs](https://docs.yourdomain.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/Serverless-Auth-Cognito/issues)

## 🎯 Roadmap

- [ ] Multi-factor authentication (MFA)
- [ ] Social login providers (Facebook, Twitter)
- [ ] Admin dashboard for user management
- [ ] Advanced threat detection with ML
- [ ] WebAuthn/Passkey support
- [ ] Session recording for security analysis
- [ ] A/B testing framework for auth flows
- [ ] GraphQL API support

## 🏆 Acknowledgments

- AWS for excellent serverless services
- The React community for amazing tools
- Contributors and testers
- Security researchers for vulnerability reports

---

**Built with ❤️ using AWS Serverless Architecture**

*Last Updated: December 2024*
*Security Grade: A+ (100/100)*