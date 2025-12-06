# IntelliShieldX AI Engine

Python Flask service for handling AI model interactions, chat streaming, security analysis, and documentation generation.

## Features

- Multi-provider LLM integration (OpenAI, Anthropic, Groq, Google)
- Real-time streaming chat responses
- Security code analysis with comprehensive vulnerability detection
- Documentation generation for repositories
- Plan-based model access control
- Server-Sent Events (SSE) for streaming
- OWASP Top 10 vulnerability detection
- Compliance impact analysis

## Setup

### Quick Setup (Recommended)

**Windows:**
```bash
setup.bat
```

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Create and activate virtual environment:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and configure your API keys:
```bash
cp .env.example .env
```

4. Add your AI provider API keys to `.env`:
- `OPENAI_API_KEY` - For OpenAI models (GPT-3.5, GPT-4, etc.)
- `ANTHROPIC_API_KEY` - For Anthropic models (Claude)
- `GROQ_API_KEY` - For Groq models (Mixtral, Llama). Get your API key from https://console.groq.com/
- `GOOGLE_API_KEY` - For Google models (Gemini)

5. Run the server:
```bash
python app.py
```

**Note:** Always activate the virtual environment before running the server. To deactivate, simply run `deactivate`.

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /health` - Check service status

### Chat
- `POST /api/chat/stream` - Stream chat responses
  - Body: `{ "message": "...", "modelId": "...", "userPlan": "...", "isAuthenticated": true/false }`
  - Returns: Server-Sent Events (SSE) stream

### Models
- `GET /api/models/available?plan=free` - Get available models for a plan

### Security Analysis
- `POST /api/analyze/security` - Analyze code for vulnerabilities
  - Body: `{ "code": "...", "fileType": "...", "fileName": "..." }`
  - Returns: Comprehensive security analysis with:
    - Vulnerability detection
    - OWASP Top 10 mapping
    - Compliance impact (GDPR, HIPAA, PCI-DSS, etc.)
    - AI-powered remediation suggestions
    - Original vs. fixed code comparison

### Documentation Generation
- `POST /api/analyze/documentation` - Generate documentation for repository
  - Body: `{ "files": [...], "repositoryName": "..." }`
  - Returns: Structured documentation including:
    - Overview
    - API endpoints
    - Model schemas
    - Project structure
    - Dependencies

### Documentation Chat
- `POST /api/chat/documentation` - Chat about documentation
  - Body: `{ "message": "...", "documentation": {...}, "modelId": "...", "userPlan": "..." }`
  - Returns: Server-Sent Events (SSE) stream

## Model Support

The engine supports multiple AI providers:
- **OpenAI** (GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o)
- **Anthropic** (Claude 3 Haiku, Sonnet, Opus)
- **Groq** (Llama models)
  - Free tier: `llama-3.1-8b-instant` (fast, efficient)
  - Standard tier: `llama-3.3-70b-versatile` (more capable)
  - Other available models: `groq/compound`, `groq/compound-mini`, `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `openai/gpt-oss-20b`, etc.
  - Get API key: https://console.groq.com/
- **Google** (Gemini Pro)

Models are categorized by plan:
- **Free**: Basic models (Groq - Llama 3.1 8B Instant)
- **Standard**: Groq + OpenAI models
- **Pro**: Standard + Advanced models (GPT-4o, Claude Opus)
- **Enterprise**: All models including specialized security models

## Security Analysis Features

### Comprehensive Security Parameters
- Cyber security
- Data privacy
- Information security
- Web application security
- Compliance & governance
- Cryptography
- Access control
- Secure coding practices
- Infrastructure/DevOps security

### OWASP Top 10 2021 Categories
- A01:2021 – Broken Access Control
- A02:2021 – Cryptographic Failures
- A03:2021 – Injection
- A04:2021 – Insecure Design
- A05:2021 – Security Misconfiguration
- A06:2021 – Vulnerable and Outdated Components
- A07:2021 – Identification and Authentication Failures
- A08:2021 – Software and Data Integrity Failures
- A09:2021 – Security Logging and Monitoring Failures
- A10:2021 – Server-Side Request Forgery (SSRF)

### Compliance Impact Analysis
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- PCI-DSS (Payment Card Industry Data Security Standard)
- SOC 2
- ISO 27001
- And more...

## Project Structure

```
model/
├── llm/
│   ├── chat_handler.py    # Chat streaming logic
│   ├── model_manager.py   # Model configuration and access
│   └── prompts.py         # System prompts
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── venv/                  # Virtual environment (gitignored)
├── setup.bat              # Windows setup script
├── setup.sh               # macOS/Linux setup script
├── .env                   # Environment variables (gitignored)
└── DEBUGGER_GUIDE.md      # Flask debugger usage guide
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /` - Service information

### Chat
- `POST /api/chat/stream` - Stream chat responses (SSE)
  - Body: `{ "message": "...", "modelId": "...", "userPlan": "...", "isAuthenticated": true/false }`
  - Returns: Server-Sent Events stream

### Models
- `GET /api/models/available?plan=free` - Get available models for plan

### Security Analysis
- `POST /api/analyze/security` - Analyze code for vulnerabilities
  - Body: `{ "code": "...", "fileType": "...", "fileName": "..." }`
  - Returns: Comprehensive security analysis

### Documentation
- `POST /api/analyze/documentation` - Generate documentation
  - Body: `{ "files": [...], "repositoryName": "..." }`
  - Returns: Structured documentation

- `POST /api/chat/documentation` - Chat about documentation
  - Body: `{ "message": "...", "documentation": {...}, "modelId": "...", "userPlan": "..." }`
  - Returns: Server-Sent Events stream

## Environment Variables

```env
PORT=5000
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key
```

## Development

### Virtual Environment

Always use the virtual environment:

```bash
# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Deactivate
deactivate
```

### Adding New Models

1. Update `llm/model_manager.py` with new model configuration
2. Add API key to `.env`
3. Update model access rules based on plans

### Flask Debugger

If you see a debugger PIN in the terminal, you can use it to debug errors interactively. See `DEBUGGER_GUIDE.md` for details.

## License

ISC
