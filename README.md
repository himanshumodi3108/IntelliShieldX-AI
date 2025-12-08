# IntelliShieldX – AI Security Analysis & Developer Assistance Platform

IntelliShieldX is a full-stack application that analyzes files, websites, and code repositories to detect security flaws, auto-generate fixes, prepare dynamic reports, and provide a real-time AI-powered Chat Assistant for any security or coding queries.

## 🎯 Features

### 🔥 Real-time AI Chat
- Context-aware chat interface
- Multi-model LLM support (OpenAI, Anthropic, Groq, Google)
- Streaming responses with Server-Sent Events (SSE)
- Code syntax highlighting
- Conversation history and management
- Plan-based model access
- PDF export for conversations
- Guest access (10 free chats for unauthenticated users with rate limiting)
- Conversation renaming and auto-naming

### 🔐 Authentication & Security
- Email/Password authentication
- OAuth providers (Google, Microsoft, Zoho Mail, GitHub, LinkedIn)
- Multi-Factor Authentication (MFA)
  - Email OTP
  - SMS OTP (Twilio)
  - Authenticator apps (TOTP - Google Authenticator, Authy, etc.)
- JWT-based session management
- Password strength validation
- Secure password suggestions
- Password reset via OTP or email link
- "Remember Me" functionality

### 💳 Subscription & Payment Management
- Razorpay payment gateway integration
- Multiple subscription tiers (Free, Standard, Pro, Enterprise)
- Plan-based feature access and limits
- 14-day cancellation period with refund eligibility
- Bank reference number tracking for refunds
- Email notifications for:
  - Welcome emails (new user registration)
  - Subscription confirmation
  - Subscription cancellation
  - Refund processed (with bank reference number)
  - Password reset links
  - MFA OTP codes

### 🤖 AI Model Selection Engine
- **Developer-level Configuration**: Admin controls which models are integrated, costs, categories, and capabilities
- **Plan-based Access**: Users can only access models based on their subscription tier
  - **Free**: Groq models (Llama 3.1 8B Instant)
  - **Standard**: Groq + OpenAI models
  - **Pro**: Standard + Advanced models (GPT-4o, Claude Opus)
  - **Enterprise**: All models including security-specialized

### 🗂 File, Code & Project Analysis
- Single file analysis
- ZIP project uploads
- Multi-language scanning
- AI-powered auto-remediation with code comparison
- OWASP Top 10 vulnerability detection
- Compliance impact analysis (GDPR, HIPAA, PCI-DSS, etc.)
- Comprehensive security parameters:
  - Cyber security
  - Data privacy
  - Information security
  - Web application security
  - Compliance & governance
  - Cryptography
  - Access control
  - Secure coding practices
  - Infrastructure/DevOps security

### 🛡️ Threat Intelligence Integration
- **Multi-source malware detection** with unified security assessment
- **VirusTotal** - File/URL/hash scanning with 70+ antivirus engines
- **MalwareBazaar** - Hash lookups and threat intelligence database
- **URLhaus** - URL reputation checking (free, unlimited)
- **Hybrid Analysis** - Advanced file analysis and sandbox reports
- **AbuseIPDB** - IP reputation and abuse tracking
- **ThreatFox** - IOC (Indicators of Compromise) checking (free, unlimited)
- **Unified Security Reports** - Combined AI analysis + threat intelligence
- **File Hash Generation** - MD5, SHA1, SHA256 for all scanned files
- **Overall Security Score** - 0-100 score with status and recommendations
- **Plan-based Access** - Threat intelligence limits per subscription tier
- **Admin Controls** - Enable/disable services from admin dashboard

### 🌐 Website & URL Scanner
- SSL check
- Header analysis
- CORS validation
- Open ports detection
- CMS version detection
- **Threat intelligence URL scanning** (VirusTotal, URLhaus, AbuseIPDB, ThreatFox)

### 📚 Repository Management & Documentation
- Connect GitHub repositories
- Repository scanning with AI remediation and threat intelligence
- AI-powered documentation generation:
  - API endpoints documentation
  - Model schemas
  - Project directory structure
  - Dependencies analysis
- Code Q&A chat for repositories
- Plan-based repository limits:
  - Free: 1 repository (3 deletions allowed)
  - Standard: 10 repositories
  - Pro: 25 repositories
  - Enterprise: Unlimited repositories
- Plan-based documentation limits:
  - Free: 1 document
  - Standard: 10 documents
  - Pro: 25 documents
  - Enterprise: Unlimited documents

### 📊 Dashboard & Visualization
- Real-time statistics for authenticated users
- Demo data for unauthenticated users
- Severity distribution charts
- Weekly vulnerability trends
- Recent scans
- Usage analytics
- Model usage statistics

### 🧾 PDF Report Generation
- Executive summary
- Vulnerabilities with CWE/OWASP mapping
- Code snippets with line numbers
- Original vs. AI-remediated code comparison
- Remediation recommendations
- **Threat intelligence results** (VirusTotal, MalwareBazaar, URLhaus, etc.)
- **Overall security assessment** with score and status
- **File hashes** (MD5, SHA1, SHA256)
- Digital signature & QR code
- Formatted markdown content (bold, italic, underline, lists)

### 🍪 Cookie Consent Management
- Cookie consent banner
- Granular cookie preferences (Necessary, Analytics, Marketing, Functional)
- Accept All / Accept Necessary Only / Reject All options
- Customize preferences
- Persistent storage of preferences

### 👨‍💼 Admin Dashboard
- Comprehensive admin panel for platform management
- User management (view, edit, suspend, activate, change plans)
- Subscription management with refund processing
- Revenue analytics and tracking
- Usage analytics (scans, documentation, chat, models, threat intelligence)
- AI model management (CRUD operations)
- Content management (scans, documentation, conversations)
- System monitoring (health checks, metrics, uptime)
- Settings management (OAuth, payments, email configuration)
- **Threat intelligence settings** (enable/disable services per plan)
- **Pricing plan management** with threat intelligence limits
- Reports system (revenue, user growth, usage reports)
- Admin activity logs with audit trail
- Role-based access control (admin vs super_admin)

## 🏗 Project Structure

```
/intellishieldx
 ├── client/                 # React frontend (Vite + TypeScript)
 │    ├── src/
 │    │    ├── components/
 │    │    │    ├── auth/    # Authentication components
 │    │    │    ├── chat/    # Chat components
 │    │    │    ├── dashboard/
 │    │    │    ├── scan/
 │    │    │    ├── payments/ # Payment components
 │    │    │    ├── documentation/ # Documentation components
 │    │    │    └── ui/      # shadcn/ui components
 │    │    ├── pages/        # Page components
 │    │    ├── hooks/        # React hooks
 │    │    └── lib/          # Utilities & API client
 │    └── package.json
 │
 ├── server/                 # Node.js backend (Express)
 │    ├── src/
 │    │    ├── routes/       # API routes
 │    │    ├── models/       # MongoDB models
 │    │    ├── services/     # Business logic
 │    │    │    ├── emailService.js # Email notifications
 │    │    │    ├── razorpayService.js # Payment processing
 │    │    │    └── ...
 │    │    ├── middleware/   # Auth, error handling
 │    │    └── config/       # Database config
 │    └── package.json
 │
 └── model/                  # Python AI service (Flask)
      ├── llm/
      │    ├── chat_handler.py
      │    ├── model_manager.py
      │    └── prompts.py
      ├── app.py
      └── requirements.txt
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- MongoDB (local or cloud)
- API keys for AI providers (OpenAI, Anthropic, Groq, Google)
- Razorpay account (for payments)
- SMTP server credentials (for email notifications)
- Threat intelligence API keys (optional):
  - VirusTotal API key (recommended)
  - Hybrid Analysis API key (optional)
  - AbuseIPDB API key (optional)
  - MalwareBazaar API key (optional, get from https://bazaar.abuse.ch/api/)
  - ThreatFox API key (optional, get from https://threatfox.abuse.ch/api/)

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

### Backend Setup

```bash
cd server
npm install

# Copy .env.example to .env and configure
cp .env.example .env

# Edit .env with your configuration
npm run dev
```

Backend will run on `http://localhost:3001`

### AI Engine Setup

**Quick Setup (Windows):**
```bash
cd model
setup.bat
```

**Quick Setup (macOS/Linux):**
```bash
cd model
chmod +x setup.sh
./setup.sh
```

**Manual Setup:**
```bash
cd model

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy .env.example to .env and add API keys
cp .env.example .env

# Edit .env with your AI provider API keys
python app.py
```

**Note:** Always activate the virtual environment before running the server.

AI Engine will run on `http://localhost:5000`

### Database Setup

1. Start MongoDB (if running locally)
2. The backend will automatically connect on startup
3. Seed initial AI models (optional):

```bash
cd server
node scripts/seed-models.js
```

4. Create admin user (required for admin dashboard):

```bash
cd server
node scripts/seed-admin.js [email] [password] [name] [role]
```

Example:
```bash
node scripts/seed-admin.js admin@intellishieldx.ai admin123 "Admin User" super_admin
```

Default values:
- Email: `admin@intellishieldx.ai`
- Password: `admin123`
- Name: `Admin User`
- Role: `super_admin` (options: `admin`, `super_admin`)

**⚠️ Important:** Change the default password after first login!

## 🔧 Configuration

### Environment Variables

#### Backend (`server/.env`)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/intellishieldx
JWT_SECRET=your-secret-key
PYTHON_ENGINE_URL=http://localhost:5000

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# MFA & SMS (Optional - for SMS OTP)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Email Service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@intellishieldx.ai
EMAIL_FROM_NAME=IntelliShieldX

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# GST Configuration (Optional)
GST_ENABLED=yes
GST_RATE=18
TRANSACTION_FEE_RATE=2

# Threat Intelligence Services (Optional)
VIRUSTOTAL_API_KEY=your-virustotal-api-key
VIRUSTOTAL_RATE_LIMIT_PER_MINUTE=4
MALWAREBAZAAR_API_KEY=your-malwarebazaar-api-key
# Get MalwareBazaar Auth-Key from: https://bazaar.abuse.ch/api/
HYBRID_ANALYSIS_API_KEY=your-hybrid-analysis-api-key
ABUSEIPDB_API_KEY=your-abuseipdb-api-key
THREATFOX_API_KEY=your-threatfox-api-key
# Note: URLhaus works without API key (free, unlimited)
# Get MalwareBazaar Auth-Key from: https://bazaar.abuse.ch/api/
# Get ThreatFox Auth-Key from: https://threatfox.abuse.ch/api/
```

#### AI Engine (`model/.env`)
```env
PORT=5000
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key
```

#### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/oauth/:provider` - Initiate OAuth flow
- `GET /api/auth/oauth/:provider/callback` - OAuth callback handler
- `POST /api/auth/forgot-password/otp` - Request password reset OTP
- `POST /api/auth/forgot-password/verify-otp` - Verify OTP and reset password
- `POST /api/auth/forgot-password/link` - Request password reset link
- `POST /api/auth/reset-password` - Reset password with token

### Chat
- `GET /api/chat/conversations` - Get user conversations
- `POST /api/chat/conversations` - Create new conversation
- `PUT /api/chat/conversations/:id` - Rename conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/messages` - Send message (streaming)
- `POST /api/chat/guest/message` - Send guest message (unauthenticated)
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Models
- `GET /api/models/available` - Get available models for user's plan

### Scans
- `POST /api/scan/upload` - Upload files for scanning (includes threat intelligence)
- `POST /api/scan/url` - Scan URL (includes threat intelligence)
- `POST /api/repositories/:id/scan` - Scan GitHub repository (includes threat intelligence)
- `GET /api/scan/:id` - Get scan results (includes threat intelligence data)
- `GET /api/scan` - Get scan history (paginated)
- `DELETE /api/scan/:id` - Delete scan
- `POST /api/scan/:id/chat` - Add chat message to scan
- `GET /api/scan/:id/chat` - Get scan chat messages
- `POST /api/scan/:id/chat/stream` - Stream AI response for scan chat

### Repositories
- `GET /api/repositories` - Get connected repositories
- `POST /api/repositories/connect` - Connect GitHub account
- `POST /api/repositories/:id/connect` - Connect specific repository
- `DELETE /api/repositories/:id` - Disconnect repository

### Documentation
- `POST /api/documentation/:repositoryId/generate` - Generate documentation
- `GET /api/documentation/:repositoryId` - Get documentation
- `GET /api/documentation/:repositoryId/chat` - Get documentation chat
- `POST /api/documentation/:repositoryId/chat` - Add chat message
- `POST /api/documentation/:repositoryId/chat/stream` - Stream AI response

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify-payment` - Verify payment and activate subscription
- `GET /api/payments/subscription` - Get current subscription
- `POST /api/payments/cancel-subscription` - Cancel subscription and process refund

### User
- `GET /api/user/plan` - Get user's subscription plan
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/mfa/enable` - Enable MFA
- `POST /api/user/mfa/disable` - Disable MFA
- `POST /api/user/mfa/setup-email` - Setup Email OTP
- `POST /api/user/mfa/setup-sms` - Setup SMS OTP
- `POST /api/user/mfa/setup-totp` - Setup TOTP authenticator

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

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
- `GET /api/admin/content/documentation` - List documentation
- `GET /api/admin/content/conversations` - List conversations
- `GET /api/admin/system/health` - System health check
- `GET /api/admin/system/metrics` - System metrics
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings (super-admin only)
- `PUT /api/admin/settings/:category` - Update specific category (super-admin only)
- `GET /api/admin/pricing` - Get pricing plans
- `POST /api/admin/pricing` - Create pricing plan (super-admin only)
- `PUT /api/admin/pricing/:id` - Update pricing plan (super-admin only)
- `DELETE /api/admin/pricing/:id` - Delete pricing plan (super-admin only)
- `GET /api/admin/reports/revenue` - Revenue report
- `GET /api/admin/reports/users` - User report
- `GET /api/admin/reports/usage` - Usage report
- `GET /api/admin/logs` - Admin activity logs

## 🎨 Frontend Features

### Chat Interface
- Real-time streaming responses
- Code syntax highlighting
- Message history
- Model selection sidebar
- Conversation management
- Conversation renaming
- PDF export

### Model Selection
- Plan-based filtering
- Model cards with details (speed, accuracy, cost)
- Category grouping (Basic, Standard, Advanced, Enterprise)
- Availability indicators

### Subscription Management
- View current plan and usage
- Upgrade/downgrade options
- Cancellation with refund eligibility check
- Bank reference number display for refunds
- Email notifications for all subscription events

## 🔐 Authentication & Security

### Authentication Methods
- Email/Password authentication
- OAuth providers (Google, Microsoft, Zoho Mail, GitHub, LinkedIn)
- Multi-Factor Authentication (MFA)
  - Email OTP - Receive one-time passwords via email
  - SMS OTP - Receive one-time passwords via SMS (requires Twilio)
  - Authenticator Apps - TOTP support (Google Authenticator, Authy, etc.)

### Subscription Tiers

| Plan | Price | Model Access | Scans | Repositories | Documentation | Chat Messages | Threat Intelligence |
|------|-------|-------------|-------|--------------|---------------|---------------|-------------------|
| **Free** | ₹0 | Groq models | 5/month | 1 (3 deletions) | 1 | 10/day (guest) | URLhaus, ThreatFox (unlimited) |
| **Standard** | ₹499 | Groq + OpenAI | Unlimited | 10 | 10 | Unlimited | + MalwareBazaar, VirusTotal (10/day) |
| **Pro** | ₹999 | Standard + Advanced | Unlimited | 25 | 25 | Unlimited | + Hybrid Analysis (20/day), AbuseIPDB (100/day), VirusTotal (50/day) |
| **Enterprise** | ₹4,999 | All models | Unlimited | Unlimited | Unlimited | Unlimited | All services (VirusTotal unlimited, Hybrid Analysis 100/day, AbuseIPDB 1,000/day) |

**Note:** All paid plans are valid for 1 year or until limits are exhausted, whichever is earlier. 14-day cancellation period available for Standard and Pro plans (if usage < 15% of limits).

### Threat Intelligence Features by Plan

| Service | Free | Standard | Pro | Enterprise |
|---------|------|----------|-----|------------|
| **URLhaus** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **ThreatFox** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **MalwareBazaar** | ❌ | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **VirusTotal** | ❌ | ✅ 10/day | ✅ 50/day | ✅ Unlimited* |
| **Hybrid Analysis** | ❌ | ❌ | ✅ 20/day | ✅ 100/day |
| **AbuseIPDB** | ❌ | ❌ | ✅ 100/day | ✅ 1,000/day |

*Subject to VirusTotal API tier limits

## 🛠 Development

### Running in Development Mode

1. Start MongoDB
2. Start AI Engine: 
   ```bash
   cd model
   # Activate venv (Windows: venv\Scripts\activate, macOS/Linux: source venv/bin/activate)
   python app.py
   ```
3. Start Backend: `cd server && npm run dev`
4. Start Frontend: `cd client && npm run dev`

### Admin Dashboard Access

1. Create an admin user (see Database Setup above)
2. Navigate to `http://localhost:5173/admin/login`
3. Login with your admin credentials
4. Access the admin dashboard at `http://localhost:5173/admin/dashboard`

For detailed admin dashboard setup and features, see `ADMIN_SETUP.md`.

### Building for Production

```bash
# Frontend
cd client
npm run build

# Backend (runs as-is)
cd server
npm start

# AI Engine (activate venv first)
cd model
# Activate venv (Windows: venv\Scripts\activate, macOS/Linux: source venv/bin/activate)
python app.py
```

## 🚀 Deployment

### Quick Deploy

**Recommended Setup:**
- **Backend & AI Model**: [Render](https://render.com) (Web Service)
- **Frontend**: [Vercel](https://vercel.com)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)

### Deployment Steps

1. **Backend Deployment (Render)**
   - Create Web Service in Render
   - Set root directory to `server`
   - Add environment variables (see `DEPLOYMENT.md`)
   - Deploy AI model as separate service (root directory: `model`)

2. **Frontend Deployment (Vercel)**
   - Import GitHub repository
   - Set root directory to `client`
   - Add environment variables (API base URL, OAuth redirects)
   - Deploy automatically on push

3. **Database Setup**
   - Create MongoDB Atlas cluster (free tier)
   - Whitelist Render IPs
   - Add connection string to Render environment variables

### Alternative Platforms

**Backend Alternatives:**
- Railway, Fly.io, DigitalOcean App Platform, AWS Elastic Beanstalk, Google Cloud Run, Azure App Service

**Frontend Alternatives:**
- Netlify, Cloudflare Pages, AWS Amplify, GitHub Pages

### Detailed Deployment Guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for:
- Complete step-by-step deployment instructions
- Environment variable configuration
- Security checklist
- Troubleshooting guide
- Scaling recommendations
- Docker deployment options

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, contact: contact@intellishieldx.ai
