# Serverless Authentication System

Full-stack authentication system using AWS Cognito, Lambda, API Gateway, DynamoDB, and React with Redux.

## Architecture

- **Frontend**: React with Redux Toolkit and Tailwind CSS
- **Backend**: Python 3.12 Lambda functions
- **Authentication**: AWS Cognito User Pool
- **API**: AWS API Gateway with CORS configuration
- **Database**: DynamoDB
- **Infrastructure**: Terraform

## Features

- User signup with email verification
- User signin with JWT tokens (stored in secure cookies)
- Password reset functionality
- Protected dashboard route with session management
- Modern UI with Tailwind CSS
- State management with Redux Toolkit
- Automatic token refresh mechanism
- Inactivity timeout with warning system
- Secure cookie-based authentication

## Setup Instructions

### 1. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Deploy the infrastructure
terraform apply
```

### 2. Update Frontend Configuration

After deploying, update the API URL in `frontend-auth/.env`:

```
REACT_APP_API_URL=<your-api-gateway-url>
```

You can find the API URL in the Terraform outputs.

### 3. Run the Frontend

```bash
cd frontend-auth
npm install
npm start
```

## Project Structure

```
.
├── lambda_functions/       # Lambda function code
│   ├── signup/
│   ├── signin/
│   ├── verify/
│   ├── forgot_password/
│   ├── reset_password/
│   └── shared/            # Shared utilities
├── frontend-auth/         # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── store/        # Redux store
│   │   └── config/       # Configuration
├── *.tf                   # Terraform infrastructure files
└── README.md
```

## API Endpoints

- `POST /auth/signup` - Register new user
- `POST /auth/signin` - Sign in user
- `POST /auth/verify` - Verify email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

## Security Implementation

### Current Security Features
1. **Cookie-Based Authentication**:
   - JWT tokens (access, refresh, ID) stored in secure browser cookies
   - Cookies configured with `SameSite=Strict` to prevent CSRF attacks
   - `Secure` flag automatically enabled for HTTPS connections
   - No sensitive tokens stored in localStorage

2. **Token Management**:
   - Automatic token refresh before expiration (5-minute proactive refresh)
   - Axios interceptors handle token inclusion in API requests
   - Automatic retry with token refresh on 401 responses
   - Secure token rotation mechanism

3. **Session Security**:
   - 2-hour inactivity timeout with 5-minute warning
   - Activity tracking (mouse, keyboard, scroll events)
   - Automatic logout on inactivity
   - Session extension capability

4. **Error Handling**:
   - Sign-in errors persisted in localStorage for UX (non-sensitive data only)
   - User-friendly error messages with technical details logged separately
   - Comprehensive error logging system

5. **Password Requirements**:
   - Minimum 8 characters
   - Must include uppercase, lowercase, numbers, and special characters
   - Real-time validation feedback

6. **CORS Configuration**:
   - Currently configured for all origins (update for production)

## Recommended Production Enhancements

### Security Improvements
1. **Enhanced Cookie Security**:
   - Implement httpOnly cookies (prevents JavaScript access to tokens)
   - Add CSRF token validation
   - Implement secure cookie encryption

2. **Advanced Token Management**:
   - Implement refresh token rotation (single-use refresh tokens)
   - Add token blacklisting for logout
   - Implement shorter token lifetimes

3. **API Security**:
   - Add rate limiting per user/IP
   - Configure specific CORS origins (no wildcards)
   - Implement API key authentication
   - Add request signing/HMAC validation

4. **Infrastructure Security**:
   - Enable AWS WAF for DDoS protection
   - Implement CloudFront with geo-restrictions
   - Add VPC endpoints for Lambda functions
   - Enable AWS CloudTrail for audit logging

### Infrastructure Enhancements
1. **Performance & Scalability**:
   - Add CloudFront CDN distribution
   - Implement Lambda@Edge for authentication
   - Configure auto-scaling for Lambda concurrency
   - Add ElastiCache for session management

2. **Reliability**:
   - Set up multi-region failover
   - Implement automated backups for DynamoDB
   - Add disaster recovery plan
   - Configure dead letter queues

3. **Monitoring & Observability**:
   - Set up CloudWatch dashboards
   - Implement distributed tracing with X-Ray
   - Add custom metrics and alarms
   - Configure log aggregation

### Application Enhancements
1. **User Experience**:
   - Add social login providers (Google, Facebook, etc.)
   - Implement MFA/2FA support
   - Add remember me functionality
   - Implement progressive web app features

2. **Developer Experience**:
   - Add API versioning
   - Implement OpenAPI/Swagger documentation
   - Add integration tests
   - Set up CI/CD pipelines

## Environment Variables

### Lambda Functions
- `COGNITO_CLIENT_ID` - Cognito app client ID
- `COGNITO_USER_POOL_ID` - Cognito user pool ID
- `USERS_TABLE` - DynamoDB table name

### Frontend
- `REACT_APP_API_URL` - API Gateway endpoint URL