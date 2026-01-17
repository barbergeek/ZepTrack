import { Router } from 'express';
import { Database } from '../database';

export const profileRouter = Router();

// Get profile
profileRouter.get('/', (req, res) => {
  const db: Database = (req as any).db;
  const profile = db.getProfile();

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json(profile);
});

// Update profile
profileRouter.post('/', (req, res) => {
  const db: Database = (req as any).db;

  try {
    const profile = db.saveProfile('default-user', req.body);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: 'Failed to save profile' });
  }
});
