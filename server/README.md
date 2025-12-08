# IntelliShieldX Backend Server

Node.js/Express backend API server for IntelliShieldX platform.

## Features

- RESTful API endpoints
- JWT-based authentication
- OAuth integration (Google, Microsoft, Zoho, GitHub, LinkedIn)
- Multi-Factor Authentication (MFA) support
- MongoDB database integration
- File upload handling
- Error handling middleware
- CORS configuration
- Razorpay payment gateway integration
- Email service with SMTP support
- Subscription management
- Repository management (GitHub integration)
- Documentation generation
- **Threat intelligence integration** (VirusTotal, MalwareBazaar, URLhaus, Hybrid Analysis, AbuseIPDB, ThreatFox)
- **Unified security assessment** combining AI analysis with threat intelligence
- Rate limiting for guest users
- Admin dashboard API endpoints
- Admin authentication and authorization
- Admin activity logging

## Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- Razorpay account (for payments)
- SMTP server (for email notifications)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# - MongoDB URI
# - JWT Secret
# - OAuth credentials
# - MFA/SMS credentials (optional)
# - Email service (SMTP)
# - Razorpay credentials
# - GST configuration (optional)
```

### Running

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:3001` (or PORT specified in .env)

## Environment Variables

See `.env.example` for all required environment variables.

### Required
- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend application URL
- `BACKEND_URL` - Backend API URL
- `PYTHON_ENGINE_URL` - Python AI engine URL (default: http://localhost:5000)

### OAuth (Optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`

### MFA/SMS (Optional)
- `TWILIO_ACCOUNT_SID` - For SMS OTP
- `TWILIO_AUTH_TOKEN` - For SMS OTP
- `TWILIO_PHONE_NUMBER` - For SMS OTP

### Email Service (Required for email notifications)
- `SMTP_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (e.g., 587 for STARTTLS, 465 for SSL/TLS)
- `SMTP_SECURE` - Use SSL/TLS connection (true/false)
  - **Port 587**: `SMTP_SECURE=false` (uses STARTTLS - connection is still encrypted!)
  - **Port 465**: `SMTP_SECURE=true` (uses SSL/TLS)
  - **Auto-detect**: If not set, defaults to `true` for port 465, `false` for others
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password (use App Password for Gmail, not regular password)
- `EMAIL_FROM` - From email address
- `EMAIL_FROM_NAME` - From name (default: IntelliShieldX)

**Important**: For Gmail, you must use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### Razorpay Payment Gateway (Required for payments)
- `RAZORPAY_KEY_ID` - Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Razorpay key secret

### GST Configuration (Optional)
- `GST_ENABLED` - Enable GST (yes/no, default: no)
- `GST_RATE` - GST rate percentage (default: 18)
- `TRANSACTION_FEE_RATE` - Transaction fee percentage (default: 2)

### Threat Intelligence Services (Optional)
- `VIRUSTOTAL_API_KEY` - VirusTotal API key (recommended)
- `VIRUSTOTAL_RATE_LIMIT_PER_MINUTE` - Rate limit for VirusTotal (default: 4)
- `MALWAREBAZAAR_API_KEY` - MalwareBazaar Auth-Key (optional, get from https://bazaar.abuse.ch/api/)
- `HYBRID_ANALYSIS_API_KEY` - Hybrid Analysis API key (optional)
- `ABUSEIPDB_API_KEY` - AbuseIPDB API key (optional)
- `THREATFOX_API_KEY` - ThreatFox Auth-Key (optional, get from https://threatfox.abuse.ch/api/)
- Note: URLhaus works without API key (free, unlimited)
- Get MalwareBazaar Auth-Key from: https://bazaar.abuse.ch/api/

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/oauth/:provider` - OAuth login
- `GET /api/auth/oauth/:provider/callback` - OAuth callback
- `POST /api/auth/forgot-password/otp` - Request password reset OTP
- `POST /api/auth/forgot-password/verify-otp` - Verify OTP and reset password
- `POST /api/auth/forgot-password/link` - Request password reset link
- `POST /api/auth/reset-password` - Reset password with token

### Chat
- `GET /api/chat/conversations` - Get user conversations
- `POST /api/chat/conversations` - Create conversation
- `PUT /api/chat/conversations/:id` - Rename conversation
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/conversations/:id/messages` - Send message (SSE)
- `POST /api/chat/guest/message` - Send guest message (unauthenticated, rate limited)
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Models
- `GET /api/models/available` - Get available models (supports optional authentication)

### Scans
- `POST /api/scan/upload` - Upload files for scanning (includes threat intelligence)
- `POST /api/scan/url` - Scan URL (includes threat intelligence)
- `POST /api/repositories/:id/scan` - Scan GitHub repository (includes threat intelligence)
- `GET /api/scan/:id` - Get scan results (includes threat intelligence data)
- `GET /api/scan` - Get scan history (paginated, with search and filters)
- `DELETE /api/scan/:id` - Delete scan
- `POST /api/scan/:id/chat` - Add chat message to scan
- `GET /api/scan/:id/chat` - Get scan chat messages
- `POST /api/scan/:id/chat/stream` - Stream AI response for scan chat

### Repositories
- `GET /api/repositories` - Get connected repositories
- `POST /api/repositories/connect` - Connect GitHub account
- `POST /api/repositories/:id/connect` - Connect specific repository
- `POST /api/repositories/:id/scan` - Scan repository (includes threat intelligence)
- `DELETE /api/repositories/:id` - Disconnect repository

### Documentation
- `POST /api/documentation/:repositoryId/generate` - Generate documentation (rate limited by plan)
- `GET /api/documentation/:repositoryId` - Get documentation
- `GET /api/documentation/:repositoryId/chat` - Get documentation chat messages
- `POST /api/documentation/:repositoryId/chat` - Add chat message
- `POST /api/documentation/:repositoryId/chat/stream` - Stream AI response

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify-payment` - Verify payment and activate subscription
- `GET /api/payments/subscription` - Get current subscription details
- `POST /api/payments/cancel-subscription` - Cancel subscription and process refund

### User
- `GET /api/user/plan` - Get user plan
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/mfa/enable` - Enable MFA
- `POST /api/user/mfa/disable` - Disable MFA
- `POST /api/user/mfa/setup-email` - Setup Email OTP
- `POST /api/user/mfa/setup-sms` - Setup SMS OTP
- `POST /api/user/mfa/setup-totp` - Setup TOTP

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (supports optional authentication)

### Admin (Protected - Admin Only)
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/profile` - Get admin profile
- `POST /api/admin/auth/change-password` - Change admin password
- `GET /api/admin/users` - List users (with pagination, search, filters)
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `POST /api/admin/users/:id/suspend` - Suspend user
- `POST /api/admin/users/:id/activate` - Activate user
- `POST /api/admin/users/:id/change-plan` - Change user plan
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/subscriptions` - List subscriptions
- `GET /api/admin/subscriptions/:id` - Get subscription details
- `POST /api/admin/subscriptions/:id/refund` - Process refund
- `GET /api/admin/subscriptions/analytics/revenue` - Revenue analytics
- `GET /api/admin/analytics/overview` - Overview analytics
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/analytics/usage` - Usage analytics
- `GET /api/admin/models` - List AI models
- `POST /api/admin/models` - Create model
- `PUT /api/admin/models/:id` - Update model
- `DELETE /api/admin/models/:id` - Delete model
- `GET /api/admin/content/scans` - List scans
- `DELETE /api/admin/content/scans/:id` - Delete scan
- `GET /api/admin/content/documentation` - List documentation
- `DELETE /api/admin/content/documentation/:id` - Delete documentation
- `GET /api/admin/content/conversations` - List conversations
- `DELETE /api/admin/content/conversations/:id` - Delete conversation
- `GET /api/admin/system/health` - System health check
- `GET /api/admin/system/metrics` - System metrics
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings (super-admin only)
- `PUT /api/admin/settings/:category` - Update specific category (super-admin only)
- `GET /api/admin/pricing` - Get pricing plans
- `GET /api/admin/pricing/:id` - Get pricing plan details
- `POST /api/admin/pricing` - Create pricing plan (super-admin only)
- `PUT /api/admin/pricing/:id` - Update pricing plan (super-admin only)
- `DELETE /api/admin/pricing/:id` - Delete pricing plan (super-admin only)
- `GET /api/admin/reports/revenue` - Revenue report
- `GET /api/admin/reports/users` - User report
- `GET /api/admin/reports/usage` - Usage report
- `GET /api/admin/logs` - Admin activity logs

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # MongoDB connection
│   │   └── oauth.js     # OAuth configuration
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # Authentication middleware
│   │   ├── adminAuth.js # Admin authentication middleware
│   │   └── errorHandler.js
│   ├── models/          # MongoDB models
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   ├── AIModel.js
│   │   ├── Scan.js
│   │   ├── Subscription.js
│   │   ├── ConnectedAccount.js
│   │   ├── Repository.js
│   │   ├── Documentation.js
│   │   ├── GuestRateLimit.js
│   │   ├── AdminUser.js
│   │   └── AdminLog.js
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── models.js
│   │   ├── scan.js
│   │   ├── user.js
│   │   ├── repositories.js
│   │   ├── documentation.js
│   │   ├── payments.js
│   │   ├── dashboard.js
│   │   └── admin/        # Admin routes
│   │       ├── index.js
│   │       ├── auth.js
│   │       ├── users.js
│   │       ├── subscriptions.js
│   │       ├── analytics.js
│   │       ├── models.js
│   │       ├── content.js
│   │       ├── system.js
│   │       ├── settings.js
│   │       ├── reports.js
│   │       └── logs.js
│   ├── services/        # Business logic
│   │   ├── oauthService.js
│   │   ├── mfaService.js
│   │   ├── chatService.js
│   │   ├── modelService.js
│   │   ├── emailService.js
│   │   ├── razorpayService.js
│   │   ├── passwordResetService.js
│   │   ├── guestRateLimitService.js
│   │   ├── adminLogService.js
│   │   ├── hashService.js
│   │   ├── unifiedThreatIntelligenceService.js
│   │   ├── virusTotalService.js
│   │   ├── malwareBazaarService.js
│   │   ├── urlhausService.js
│   │   ├── hybridAnalysisService.js
│   │   ├── abuseIPDBService.js
│   │   └── threatFoxService.js
│   └── index.js         # Entry point
├── uploads/             # Uploaded files
├── scripts/             # Utility scripts
│   ├── seed-models.js   # Seed AI models
│   └── seed-admin.js    # Create admin user
└── package.json
```


## MFA Setup

Multi-Factor Authentication supports:
- **Email OTP**: One-time passwords sent via email (requires SMTP configuration)
- **SMS OTP**: One-time passwords sent via SMS (requires Twilio)
- **TOTP**: Time-based one-time passwords (Google Authenticator, Authy, etc.)

## Email Service

The email service sends notifications for:
- Welcome emails (new user registration)
- Subscription confirmation
- Subscription cancellation
- Refund processed (with bank reference number)
- Password reset links
- MFA OTP codes

### Gmail Setup
1. Enable 2-Step Verification on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASS` (not your regular password)

## Payment Integration

### Razorpay Setup
1. Create a Razorpay account: https://razorpay.com/
2. Get your Key ID and Key Secret from the dashboard
3. Add them to `.env`:
   ```env
   RAZORPAY_KEY_ID=your-key-id
   RAZORPAY_KEY_SECRET=your-key-secret
   ```

### GST Configuration
- Set `GST_ENABLED=yes` to enable GST
- Set `GST_RATE=18` for 18% GST (adjust as needed)
- Transaction fees are automatically calculated and added

### Subscription Management
- Plans are valid for 1 year or until limits are exhausted
- 14-day cancellation period for Standard and Pro plans
- Refunds processed automatically if eligible (< 15% usage)
- Bank reference numbers stored for refund tracking

## Database Models

### User
- Basic user information
- OAuth provider details
- MFA settings
- Subscription plan and status
- Usage statistics (scans, documentation, chat messages, threat intelligence)

### Conversation
- Chat conversations
- Messages
- Timestamps
- Conversation names

### Scan
- Scan results
- Vulnerabilities with OWASP/CWE mapping
- AI insights and remediation
- Chat messages
- Compliance impacts
- **Threat intelligence data**:
  - File hashes (MD5, SHA1, SHA256)
  - VirusTotal results
  - MalwareBazaar results
  - URLhaus results
  - Hybrid Analysis results
  - AbuseIPDB results
  - ThreatFox results
- **Overall security assessment** (score, status, recommendations)

### Subscription
- Plan details
- Payment information
- Refund details (including bank reference number)
- Cancellation information
- Usage at cancellation

### Repository
- Connected GitHub repositories
- Repository metadata
- Connection status

### Documentation
- AI-generated documentation
- API endpoints
- Model schemas
- Project structure
- Chat messages

### AdminUser
- Admin account information
- Role (admin/super_admin)
- Permissions
- Last login tracking

### AdminLog
- Admin action audit trail
- IP address and user agent tracking
- Resource and action details

## Threat Intelligence Services

The platform integrates multiple threat intelligence services for comprehensive security analysis:

### Services
- **VirusTotal**: File/URL/hash scanning with 70+ antivirus engines (requires API key)
- **MalwareBazaar**: Hash lookups and threat intelligence (works without key, optional key for higher limits)
- **URLhaus**: URL reputation checking (free, unlimited, no key required)
- **Hybrid Analysis**: Advanced file analysis and sandbox reports (requires API key)
- **AbuseIPDB**: IP reputation and abuse tracking (requires API key)
- **ThreatFox**: IOC (Indicators of Compromise) checking (free, unlimited, no key required)

### Features
- Unified threat intelligence orchestration
- Automatic hash generation (MD5, SHA1, SHA256)
- Overall security score calculation (0-100)
- Plan-based rate limiting
- Admin controls to enable/disable services
- Integrated with file, URL, and repository scans

## Admin Dashboard

The backend includes a comprehensive admin API for managing the platform. See `ADMIN_SETUP.md` for detailed setup instructions.

### Creating Admin User

```bash
node scripts/seed-admin.js [email] [password] [name] [role]
```

Example:
```bash
node scripts/seed-admin.js admin@intellishieldx.ai admin123 "Admin User" super_admin
```

### Admin Models

- **AdminUser**: Admin user accounts with role-based permissions
- **AdminLog**: Audit trail of all admin actions

### Admin Middleware

- `authenticateAdmin`: Verify admin authentication
- `requireSuperAdmin`: Require super admin role
- `requirePermission`: Check specific permissions

## Development

### Adding New Routes

1. Create route file in `src/routes/`
2. Import and use in `src/index.js`
3. Add authentication middleware if needed

### Adding New Models

1. Create model file in `src/models/`
2. Export Mongoose model
3. Use in routes/services

## Testing

```bash
# Run tests (when implemented)
npm test
```

## License

ISC
