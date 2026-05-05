# ChirperPi Hub

[![CI](https://github.com/YOUR_USERNAME/chirperpi-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/chirperpi-hub/actions/workflows/ci.yml)
[![Deploy](https://github.com/YOUR_USERNAME/chirperpi-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/chirperpi-hub/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/chirperpi-hub/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/chirperpi-hub)

A decentralized social networking platform built on the Pi Network, featuring real-time messaging, governance proposals, and Pi cryptocurrency transactions.

## ✨ Features

- 🔐 **Pi Network Authentication** - Secure login using Pi Browser
- 📱 **Responsive Design** - Mobile-first approach with modern UI
- 💬 **Real-time Messaging** - WebSocket-powered chat system
- 🗳️ **Governance System** - Community proposals and voting
- 💰 **Pi Transactions** - Send and receive Pi cryptocurrency
- 👥 **Groups & Communities** - Create and join interest-based groups
- 📊 **Analytics Dashboard** - Admin monitoring and insights
- 🔍 **Advanced Search** - Find users, posts, and content
- 🔔 **Push Notifications** - Stay updated with web push
- 🌙 **Dark Mode** - Eye-friendly interface

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors
- **React Hook Form + Zod** - Form validation
- **Sentry** - Error tracking and monitoring

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe server development
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **WebSocket.io** - Real-time communication
- **JWT** - Authentication tokens
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Infrastructure
- **Docker** - Containerization
- **Railway** - Backend deployment
- **Vercel** - Frontend deployment
- **GitHub Actions** - CI/CD pipelines
- **Sentry** - Error monitoring

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js 18.x or higher** - [Download here](https://nodejs.org/)
- **PostgreSQL 13+** - Database server
- **Redis 6+** - Caching server
- **Git** - Version control
- **Pi Network Account** - For OAuth setup

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/chirperpi-hub.git
cd chirperpi-hub
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm run install:all
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or your preferred editor
```

### 4. Database Setup

```bash
# Start PostgreSQL and Redis (if using Docker)
cd docker && docker-compose up -d

# Run database migrations
cd server && npm run migrate
```

### 5. Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start individually:
# Server: cd server && npm run dev
# Client: cd client && npm run dev
```

Visit `http://localhost:5173` to see the application!

## 🔧 Environment Variables

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | Server | Yes | PostgreSQL connection string |
| `REDIS_URL` | Server | Yes | Redis connection URL |
| `JWT_SECRET` | Server | Yes | JWT signing secret |
| `PI_API_KEY` | Server | Yes | Pi Network API key |
| `PI_SECRET` | Server | Yes | Pi Network API secret |
| `SENTRY_DSN` | Both | No | Sentry error tracking |
| `VITE_SENTRY_DSN` | Client | No | Client-side Sentry DSN |
| `SMTP_*` | Server | No | Email configuration |
| `VAPID_*` | Server | No | Push notification keys |

See `.env.example` for complete configuration options.

## 📁 Project Structure

```
chirperpi-hub/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── db/           # Database utilities
│   │   └── utils/        # Server utilities
│   ├── migrations/        # Database migrations
│   ├── tests/            # Unit and integration tests
│   └── package.json
├── shared/                 # Shared types and constants
├── docker/                 # Docker configuration
├── e2e/                   # End-to-end tests
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run server tests only
cd server && npm test

# Run client tests only
cd client && npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🚢 Deployment

### Production Deployment

1. **Backend (Railway)**:
   ```bash
   # Set environment variables in Railway dashboard
   # Deploy automatically via GitHub Actions
   ```

2. **Frontend (Vercel)**:
   ```bash
   # Connect GitHub repo to Vercel
   # Set VITE_* environment variables
   # Deploy automatically on push to main
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
cd docker && docker-compose up -d
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all CI checks pass
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Pi Network** - For the amazing blockchain platform
- **Railway** - For hosting infrastructure
- **Vercel** - For frontend deployment
- **Sentry** - For error monitoring
- **Open source community** - For the amazing tools and libraries

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/chirperpi-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/chirperpi-hub/discussions)
- **Pi Chat**: Join our community group

---

**Made with ❤️ for the Pi Network community**