# ZepTrack

ZepTrack is a modern, responsive web application designed to track weight loss progress and Zepbound (tirzepatide) dosage history. It features Google OAuth authentication, multi-factor authentication, multi-tenancy support, and a sophisticated dashboard with interactive analytics.

## Features

### Core Features
- **Dashboard**: Visual overview of current stats, progress trends, and quick actions
- **Weight & Dosage Tracking**: Easy entry form defaulting to the current date and previous dosage
- **Interactive Charts**: Visual history of weight loss and BMI over time using Recharts
- **Data Persistence**: SQLite database for reliable, persistent storage
- **Bulk Management**: Select multiple entries to delete or manage history efficiently
- **Data Portability**: Export and import your history via JSON files in the Settings menu
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Docker Support**: Easy deployment with Docker and docker-compose

### Authentication & Security
- **Google OAuth**: Secure sign-in with Google accounts
- **Multi-Factor Authentication (MFA)**:
  - TOTP (Time-based One-Time Password) via authenticator apps
  - Email-based verification codes
  - Backup codes for account recovery
- **Session Management**: JWT-based sessions with secure HTTP-only cookies
- **Rate Limiting**: Protection against brute-force attacks on login and MFA
- **TOTP Replay Protection**: Prevents reuse of authentication codes

### Multi-Tenancy
- **User Roles**: Admin and standard user roles
- **First User Admin**: First user to sign up automatically becomes admin
- **Invite System**: Admins can invite new users via email
- **User Management**: Admin panel for managing users and roles

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with OAuth 2.0 credentials configured

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required for authentication
GOOGLE_CLIENT_ID=your-google-oauth-client-id
JWT_SECRET=your-secret-key-min-32-chars  # Generate with: openssl rand -hex 32

# Optional
PORT=3000
NODE_ENV=development
DB_PATH=./data/zeptrack.db
```

### Development Mode

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Servers** (Frontend & Backend):
   ```bash
   npm run dev:all
   ```

   Or run them separately:
   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   npm run dev:server
   ```

3. **Open Browser**:
   Navigate to `http://localhost:3010` for the frontend. The backend API runs on `http://localhost:3000`.

### Docker Deployment

The easiest way to deploy ZepTrack is using Docker:

1. **Set Environment Variables**:
   ```bash
   export GOOGLE_CLIENT_ID=your-google-oauth-client-id
   export JWT_SECRET=$(openssl rand -hex 32)
   ```

   Or create a `.env` file in the same directory as docker-compose.yml:
   ```bash
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   JWT_SECRET=your-64-char-hex-secret
   ```

2. **Build and Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Access the Application**:
   Navigate to `http://localhost:3000`

4. **View Logs**:
   ```bash
   docker-compose logs -f
   ```

5. **Stop the Application**:
   ```bash
   docker-compose down
   ```

### Using Pre-built Docker Image

```bash
docker run -d \
  -p 3000:3000 \
  -v zeptrack-data:/app/data \
  -e GOOGLE_CLIENT_ID=your-client-id \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  scotthoge/zeptrack:latest
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `JWT_SECRET` | Secret key for JWT signing (min 32 characters) |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `DB_PATH` | `./data/zeptrack.db` | Path to SQLite database |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration time |
| `SESSION_COOKIE_NAME` | `zeptrack_session` | Name of the session cookie |
| `MFA_ISSUER` | `ZepTrack` | Issuer name shown in authenticator apps |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add authorized JavaScript origins:
   - Development: `http://localhost:3010`
   - Production: Your domain (e.g., `https://zeptrack.example.com`)
6. Add authorized redirect URIs if needed
7. Copy the Client ID to your environment variables

## Data Storage

- **Database**: SQLite database stored in `/app/data/zeptrack.db` (Docker) or `./data/zeptrack.db` (local)
- **Persistence**: Data is persisted in a Docker volume named `zeptrack-data`
- **Backups**: Use the "Export JSON" feature in the Settings tab to create backups
- **Privacy**: All data remains on your server/container

## Security Features

- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **HTTP-Only Cookies**: Session tokens stored in secure, HTTP-only cookies
- **MFA Rate Limiting**: 5 attempts per 15 minutes to prevent brute-force attacks
- **TOTP Replay Protection**: Used codes tracked for 60 seconds to prevent replay attacks
- **Hashed Backup Codes**: Backup codes stored using bcrypt hashing
- **Session Revocation**: All sessions revoked when MFA is disabled
- **Production JWT Validation**: Server fails to start in production without proper JWT_SECRET
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, CSP headers

## API Endpoints

### Public Endpoints
- `GET /api/config` - Runtime configuration (Google Client ID, app version)
- `GET /api/health` - Health check
- `GET /api/status` - Detailed status including database info
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout

### Protected Endpoints (Authentication Required)
- `GET /api/auth/me` - Current user info
- `GET /api/entries` - List weight entries
- `POST /api/entries` - Create/update entry
- `DELETE /api/entries/:id` - Delete entry
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

### MFA Endpoints
- `POST /api/auth/mfa/setup/totp` - Start TOTP setup
- `POST /api/auth/mfa/setup/totp/verify` - Complete TOTP setup
- `POST /api/auth/mfa/setup/email` - Enable email MFA
- `POST /api/auth/mfa/disable` - Disable MFA
- `POST /api/auth/mfa/send-code` - Send email MFA code
- `POST /api/auth/mfa/verify` - Verify MFA code

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `POST /api/admin/invites` - Create invite
- `DELETE /api/admin/users/:id` - Delete user

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Authentication**: Google OAuth 2.0, JWT, bcrypt
- **MFA**: otplib (TOTP), QRCode generation
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Container**: Docker

## Version History

- **2.1.1**: Security hardening - MFA rate limiting, TOTP replay protection, hashed backup codes, session management improvements
- **2.1.0**: Multi-tenancy, Google OAuth authentication, MFA support (TOTP/Email), admin panel, invite system
- **1.x**: Initial release with basic weight tracking

## License

MIT
