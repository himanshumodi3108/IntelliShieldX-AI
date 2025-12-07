# IntelliShieldX Frontend

React frontend application built with Vite, TypeScript, and modern UI components.

## Features

- 🎨 Modern UI with glass morphism effects
- 🔐 Authentication (Email/Password + OAuth)
- 🔒 Multi-Factor Authentication (MFA)
- 💬 Real-time AI Chat with streaming
- 📊 Interactive Dashboard
- 🔍 Security Scanning (Files, URLs & Repositories)
- 📄 PDF Report Generation
- 📱 Fully Responsive Design
- 💳 Subscription Management
- 📚 Repository Documentation
- 🍪 Cookie Consent Management
- 👨‍💼 Admin Dashboard

## Technologies

- **Vite** - Build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Sonner** - Toast notifications
- **jsPDF** - PDF generation
- **react-syntax-highlighter** - Code highlighting

## Setup

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables (if needed)
cp .env.example .env

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
client/
├── src/
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   ├── chat/        # Chat components
│   │   ├── dashboard/   # Dashboard components
│   │   ├── layout/      # Layout components (Navbar, etc.)
│   │   ├── scan/        # Scan components
│   │   ├── payments/    # Payment components
│   │   ├── documentation/ # Documentation components
│   │   ├── admin/       # Admin components
│   │   └── ui/          # shadcn/ui components
│   ├── contexts/        # React contexts (Auth, AdminAuth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API client
│   │   ├── api.ts       # Main API client
│   │   └── adminApi.ts  # Admin API client
│   ├── pages/           # Page components
│   │   └── admin/       # Admin pages
│   ├── utils/           # Helper functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## Key Features

### Authentication
- Email/Password login and registration
- OAuth providers (Google, Microsoft, Zoho, GitHub, LinkedIn)
- Multi-Factor Authentication (MFA)
  - Email OTP
  - SMS OTP
  - Authenticator apps (TOTP)
- Password strength validation
- Password suggestions
- Password reset via OTP or email link
- "Remember Me" functionality

### AI Chat
- Real-time streaming responses
- Multi-model support
- Code syntax highlighting
- Conversation history
- Conversation renaming
- Auto-naming based on first message
- PDF export
- Guest access (10 free chats with rate limiting)

### Dashboard
- Security statistics
- Vulnerability charts
- Weekly vulnerability trends
- Recent scans
- Usage analytics
- Demo data for unauthenticated users
- Real data for authenticated users

### Security Scanning
- File upload and analysis
- URL scanning
- Repository scanning (GitHub)
- Multi-language support
- Detailed vulnerability reports
- OWASP Top 10 mapping
- Compliance impact analysis
- AI-powered remediation
- Code comparison (original vs. fixed)
- Scan chat for Q&A
- PDF report generation

### Subscription Management
- View current plan and usage
- Upgrade/downgrade options
- Razorpay payment integration
- Cancellation with refund eligibility
- Bank reference number display
- Email notifications

### Repository Management
- Connect GitHub accounts
- List and connect repositories
- Repository scanning
- Plan-based repository limits
- Repository deletion limits

### Documentation
- AI-powered documentation generation
- API endpoints documentation
- Model schemas
- Project structure
- Dependencies analysis
- Code Q&A chat
- Plan-based documentation limits

### Cookie Consent
- Cookie consent banner
- Granular preferences
- Accept All / Accept Necessary / Reject All
- Customize preferences
- Persistent storage

### Admin Dashboard
- Comprehensive admin panel for platform management
- User management (view, edit, suspend, activate, change plans)
- Subscription management with refund processing
- Revenue analytics and tracking
- Usage analytics (scans, documentation, chat, models)
- AI model management (CRUD operations)
- Content management (scans, documentation, conversations)
- System monitoring (health checks, metrics, uptime)
- Settings management (OAuth, payments, email configuration)
- Reports system (revenue, user growth, usage reports)
- Admin activity logs with audit trail
- Role-based access control (admin vs super_admin)
- Responsive design matching main website UI

## Pages

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - User dashboard (public with demo data, real data for authenticated)
- `/scan` - Security scanning (protected)
- `/chat` - AI chat assistant (public with rate limiting)
- `/history` - Scan history (protected)
- `/pricing` - Pricing plans
- `/about` - About page
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/support` - Contact support
- `/profile` - User profile with MFA settings (protected)
- `/documentation/:repositoryId` - Repository documentation (protected)
- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard overview (protected)
- `/admin/users` - User management (protected)
- `/admin/subscriptions` - Subscription management (protected)
- `/admin/analytics` - Analytics and insights (protected)
- `/admin/models` - AI model management (protected)
- `/admin/content` - Content management (protected)
- `/admin/system` - System monitoring (protected)
- `/admin/settings` - System settings (protected)
- `/admin/reports` - Reports and exports (protected)
- `/admin/logs` - Admin activity logs (protected)

## Development

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link if needed

### Adding New Components

1. Create component in appropriate `src/components/` subdirectory
2. Export and use in pages

### Styling

- Use Tailwind CSS classes
- Follow existing design patterns
- Use glass morphism effects for cards
- Use gradient text for headings

## Admin Dashboard

The frontend includes a comprehensive admin dashboard for managing the platform. See `ADMIN_SETUP.md` for detailed setup instructions.

### Admin Features
- User management with search and filters
- Subscription management and refund processing
- Revenue and usage analytics with charts
- AI model configuration
- Content moderation (scans, documentation, conversations)
- System health monitoring
- Settings configuration
- Reports generation
- Admin activity audit logs

### Admin Authentication
- Separate admin authentication context
- JWT-based admin tokens
- Role-based access control
- Protected admin routes

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## License

ISC
