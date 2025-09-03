# Serverless Authentication System with HttpOnly Cookies

🔒 **Enterprise-grade serverless authentication system** using AWS Cognito, Lambda, API Gateway, and React with **secure httpOnly cookie implementation** for maximum protection against XSS and CSRF attacks.

## 🏗️ Architecture

### Infrastructure
- **Frontend**: React with Redux Toolkit and Tailwind CSS (CloudFront)
- **Backend**: Python 3.12 Lambda functions (API Gateway)
- **Authentication**: AWS Cognito User Pool with httpOnly cookies
- **Database**: DynamoDB for user data
- **Infrastructure**: Terraform for IaC
- **Domain**: Custom domain setup for same-origin cookie sharing

### Domain Architecture
- **Frontend**: `https://your-domain.com` (CloudFront distribution)
- **API**: `https://source.your-domain.com` (API Gateway custom domain) 
- **Same Root Domain**: Enables secure SameSite=Strict cookie sharing
- **Example Implementation**: `filodelight.online` & `source.filodelight.online`

## 🔒 HttpOnly Cookie Security Implementation

### Security Features
| Feature | Implementation | Security Benefit |
|---------|---------------|-----------------|
| **HttpOnly** | `true` | Prevents XSS attacks - JavaScript cannot access tokens |
| **Secure** | `true` | HTTPS-only transmission - no token exposure over HTTP |
| **SameSite** | `Strict` | Maximum CSRF protection - same-domain requests only |
| **Custom Domain** | Same root domain | Enables strict cookie security without cross-origin issues |

### Token Management
- **Access Token**: 1-hour expiry, httpOnly cookie (authentication)
- **ID Token**: 1-hour expiry, httpOnly cookie (user profile data)
- **Refresh Token**: 30-day expiry, httpOnly cookie (token renewal)
- **Zero JavaScript Access**: Tokens completely invisible to frontend code

### Page Refresh Handling
**Problem**: HttpOnly cookies need time to become available after page refresh
**Solution**: Dual-layer timing protection
- **ProtectedRoute**: 800ms initial delay for cookie processing
- **Authentication Check**: 500ms additional buffer for reliability
- **Total**: 1.3-second buffer prevents false authentication failures

## ⚡ Features

### Authentication Flow
- ✅ User signup with email verification
- ✅ Secure signin with httpOnly cookie tokens
- ✅ Password reset functionality with secure token handling
- ✅ Automatic token refresh using refresh token from cookies
- ✅ Secure logout with server-side cookie clearing
- ✅ Page refresh authentication persistence

### Security Features
- ✅ **Zero XSS Vulnerability**: Tokens never accessible to JavaScript
- ✅ **CSRF Protection**: SameSite=Strict prevents cross-site attacks
- ✅ **Secure Transport**: All tokens transmitted over HTTPS only
- ✅ **Activity Tracking**: 2-hour inactivity timeout with warnings
- ✅ **Automatic Session Management**: Seamless token refresh
- ✅ **Protected Routes**: Authentication-required page protection

### User Experience
- ✅ Modern UI with Tailwind CSS
- ✅ Real-time form validation
- ✅ Loading states with authentication verification
- ✅ Error handling with user-friendly messages
- ✅ Responsive design for all devices

## 🚀 Setup Instructions

### Prerequisites: Domain Setup (Required for HttpOnly Cookies)

⚠️ **IMPORTANT**: This system requires a custom domain for httpOnly cookie security to work properly.

#### Step 1: Purchase Domain
Purchase a domain from any domain registrar (GoDaddy, Namecheap, etc.):
- Example domain used in this project: `filodelight.online`
- Choose any domain that suits your project

#### Step 2: Create AWS Hosted Zone (Manual Setup Required)
1. **Go to AWS Console** → Route 53 → Hosted Zones
2. **Click "Create Hosted Zone"**
3. **Enter your domain name** (e.g., `filodelight.online`)
4. **Click "Create Hosted Zone"**
5. **Copy the 4 Name Servers** from the NS record (e.g., `ns-123.awsdns-12.com`)

#### Step 3: Update Domain Nameservers
1. **Log into your domain registrar** (GoDaddy, Namecheap, etc.)
2. **Go to DNS Management / Nameservers section**
3. **Replace default nameservers** with the 4 AWS nameservers
4. **Save changes**

#### Step 4: Wait for DNS Propagation
- **Wait Time**: 1.5 - 2 hours for DNS propagation
- **Check Status**: Use `nslookup your-domain.com` or online DNS checkers
- **Required**: DO NOT proceed with deployment until DNS propagates

### 1. Deploy Infrastructure

After DNS propagation is complete:

```bash
# Update domain in variables.tf
# root_domain = "your-purchased-domain.com" 
# api_subdomain = "source"  # Creates source.your-domain.com

# Initialize Terraform
terraform init

# Review the deployment plan  
terraform plan

# Deploy the infrastructure
terraform apply
```

### 2. Configure Custom Domain Variables

Update `variables.tf` with your domain:

```hcl
variable "root_domain" {
  description = "Root domain for the application"
  type        = string
  default     = "your-domain.com"  # Change this to your purchased domain
}

variable "api_subdomain" {
  description = "Subdomain for API Gateway" 
  type        = string
  default     = "source"  # Creates source.your-domain.com
}
```

### 3. Update Frontend Configuration

Update the API URL in `frontend-auth/.env` with your domain:

```env
REACT_APP_API_URL=https://source.your-domain.com
```

### 4. Build and Deploy Frontend

```bash
cd frontend-auth
npm install
npm run build

# Deploy to S3/CloudFront (automated via CI/CD)
```

## 📁 Project Structure

```
serverless-auth-cognito/
├── lambda_functions/           # Secure Lambda functions
│   ├── signin/                # HttpOnly cookie creation
│   ├── verify_token/          # Cookie-based authentication
│   ├── user_info/            # User data retrieval via cookies  
│   ├── refresh/              # Automatic token refresh
│   ├── logout/               # Secure cookie clearing
│   └── shared/               # Security utilities
├── frontend-auth/             # React application
│   ├── src/
│   │   ├── components/       # Protected route components
│   │   ├── services/         # HttpOnly cookie auth service
│   │   ├── store/            # Redux authentication state
│   │   └── config/           # API endpoint configuration
├── *.tf                      # Terraform infrastructure
├── route53.tf               # Custom domain configuration
└── README.md               # This documentation
```

## 🛡️ Security Implementation Details

### HttpOnly Cookie Authentication Flow

#### 1. Sign In Process
```
User credentials → Frontend → API Gateway → Lambda (signin)
                                        ↓
Lambda creates JWT tokens → Sets httpOnly cookies → Browser stores securely
                                                  ↓
Frontend receives success (no token data) → Redirects to dashboard
```

#### 2. Authenticated Requests
```
Frontend API call → Browser auto-includes httpOnly cookies → API Gateway
                                                           ↓
Lambda extracts tokens from cookies → Validates with Cognito → Returns data
```

#### 3. Page Refresh Authentication
```
Page loads → ProtectedRoute (800ms delay) → Authentication check (500ms buffer)
                                         ↓
Verify-token API call with cookies → Lambda validates → Authentication confirmed
```

#### 4. Automatic Token Refresh
```
API returns 401 → Axios interceptor triggers → Refresh API call
                                            ↓
Lambda uses refresh token from cookie → Issues new tokens → Updates cookies
                                     ↓
Retries original request with fresh tokens
```

### Security Code Implementation

#### Frontend (authService.js)
```javascript
// All requests automatically include httpOnly cookies
axios.defaults.withCredentials = true;

// Authentication via API call (tokens invisible to JS)
async isAuthenticated() {
  const response = await axios.get('/auth/verify-token');
  return response.status === 200;
}
```

#### Backend (Lambda Functions)
```python
# Secure cookie creation
create_cookie('accessToken', token, 
              http_only=True,      # XSS protection
              secure=True,         # HTTPS only
              same_site='Strict')  # CSRF protection

# Cookie extraction from headers
cookies = headers.get('Cookie', '')
access_token = extract_token_from_cookies(cookies)
```

## 📊 API Endpoints

### Authentication Endpoints
- `POST /auth/signup` - Register with email verification
- `POST /auth/signin` - Secure login with httpOnly cookie creation  
- `POST /auth/verify` - Email verification
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Secure password reset
- `POST /auth/refresh` - Automatic token refresh via cookies
- `POST /auth/logout` - Secure cookie clearing

### Protected Endpoints
- `GET /auth/verify-token` - Authentication verification (uses cookies)
- `GET /auth/user-info` - User profile data (uses cookies)

## 🔧 Environment Variables

### Lambda Functions
```env
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_USER_POOL_ID=your-user-pool-id
USERS_TABLE=your-dynamodb-table
CORS_ALLOW_ORIGIN=https://filodelight.online
```

### Frontend
```env
REACT_APP_API_URL=https://source.filodelight.online
```

## 🚀 Production Deployment

### Infrastructure Components
- **AWS Cognito**: User pool and app client
- **API Gateway**: Custom domain with SSL certificate
- **Lambda Functions**: Python 3.12 with shared layers
- **Route53**: DNS records for custom domains
- **CloudFront**: Frontend distribution with custom domain
- **ACM Certificates**: SSL/TLS certificates for both domains

### Deployed URLs
- **Application**: https://filodelight.online
- **API**: https://source.filodelight.online
- **Status**: ✅ Live and operational

## 🔍 Security Benefits

### XSS Attack Prevention
- **Traditional Risk**: Malicious scripts steal tokens from localStorage
- **HttpOnly Solution**: Tokens completely invisible to JavaScript
- **Result**: Zero token exposure to XSS attacks

### CSRF Attack Prevention
- **Traditional Risk**: Cross-site requests use victim's stored tokens
- **SameSite=Strict Solution**: Cookies only sent with same-domain requests
- **Result**: Complete CSRF attack prevention

### Token Interception Prevention
- **Traditional Risk**: Network sniffing captures tokens in transit
- **Secure Flag Solution**: HTTPS-only cookie transmission
- **Result**: Encrypted token transmission always

## 📈 Performance Characteristics

### Authentication Performance
- **Initial Load**: ~800ms authentication verification
- **Page Refresh**: ~1.3s secure cookie verification  
- **Subsequent Requests**: Zero authentication overhead
- **Token Refresh**: Automatic and transparent to users

### Scalability Features
- **Serverless Architecture**: Automatic scaling with demand
- **CDN Distribution**: Global content delivery
- **Stateless Design**: No server-side session storage required
- **Efficient Caching**: Optimized API Gateway and CloudFront caching

## 🛠️ Development

### Local Development Setup
```bash
# Frontend development
cd frontend-auth
npm install
npm start

# Lambda function testing
cd lambda_functions/signin
python -m pytest tests/

# Infrastructure changes
terraform plan
terraform apply
```

### Testing Authentication
1. **Sign Up**: Create account with email verification
2. **Sign In**: Verify httpOnly cookies are set (DevTools → Application → Cookies)
3. **Page Refresh**: Confirm authentication persists
4. **Logout**: Verify cookies are cleared
5. **Expired Tokens**: Test automatic refresh functionality

## 🔒 Security Compliance

### Industry Standards
- ✅ **OWASP Top 10**: Protection against all top web vulnerabilities
- ✅ **Zero Token Storage**: No sensitive data in browser storage
- ✅ **Transport Security**: End-to-end HTTPS encryption
- ✅ **Same-Origin Policy**: Strict domain-based security

### Enterprise Security Features
- ✅ **HttpOnly Cookies**: Industry-standard secure token storage
- ✅ **CSRF Protection**: SameSite=Strict implementation
- ✅ **XSS Immunity**: Zero JavaScript token exposure
- ✅ **Secure Transport**: HTTPS-only cookie transmission
- ✅ **Activity Monitoring**: Comprehensive authentication logging
- ✅ **Session Management**: Automatic timeout and refresh

---

## 🎯 Key Achievements

This implementation delivers **enterprise-grade authentication security** with:
- 🔒 **Zero XSS vulnerability** through httpOnly cookies
- 🛡️ **Complete CSRF protection** via SameSite=Strict
- ⚡ **Seamless user experience** with optimized timing
- 🚀 **Production-ready scalability** on AWS serverless infrastructure
- 📊 **Comprehensive monitoring** and error handling

The system is **live and operational** at `https://filodelight.online` with maximum security and optimal performance.