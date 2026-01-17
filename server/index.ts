import express from 'express';
import cors from 'cors';
import { Database } from './database';
import { entriesRouter } from './routes/entries';
import { profileRouter } from './routes/profile';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();
db.initialize();

// Middleware
app.use(cors());
app.use(express.json());

// Make database available to routes
app.use((req, res, next) => {
  (req as any).db = db;
  next();
});

// API Routes
app.use('/api/entries', entriesRouter);
app.use('/api/profile', profileRouter);

// Health check
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
