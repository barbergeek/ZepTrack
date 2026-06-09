import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Database } from './database';
import { entriesRouter } from './routes/entries';
import { profileRouter } from './routes/profile';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { authRequired, adminRequired } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();
db.initialize();

// Rate limiting - simple in-memory implementation
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }

  record.count++;
  next();
};

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimit.entries()) {
    if (now > record.resetTime) {
      rateLimit.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    // In production, check against allowed origins if configured
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    // Allow all origins in development or if no origins configured
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

// Security headers middleware
const securityHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://esm.sh https://accounts.google.com/gsi/client",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://lh3.googleusercontent.com",
      "frame-src https://accounts.google.com",
      "connect-src 'self' https://esm.sh https://accounts.google.com https://oauth2.googleapis.com"
    ].join('; '));
  }
  next();
};

// Middleware
app.use(rateLimitMiddleware);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Make database available to routes
app.use((req, res, next) => {
  (req as any).db = db;
  next();
});

// Public API Routes (no auth required)
app.use('/api/auth', authRouter);

// Protected API Routes (auth required)
app.use('/api/entries', authRequired, entriesRouter);
app.use('/api/profile', authRequired, profileRouter);

// Admin API Routes (admin role required)
app.use('/api/admin', authRequired, adminRequired, adminRouter);

// Public configuration for frontend (runtime config)
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appVersion: process.env.npm_package_version || '2.1.1',
  });
});

// Health/Status check (public)
app.get('/api/status', (req, res) => {
  const dbInstance = (req as any).db as Database;
  const dbStatus = dbInstance.getStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: dbStatus.connected,
      entries: dbStatus.entries,
      profiles: dbStatus.profiles
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version
  });
});

// Legacy health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'dist' });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
