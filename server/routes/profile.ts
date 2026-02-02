import { Router } from 'express';
import { Database } from '../database';
import { validateProfile } from '../validation';

export const profileRouter = Router();

// Get profile
profileRouter.get('/', (req, res) => {
  const db: Database = (req as any).db;
  const profile = db.getProfile(req.userId!);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json(profile);
});

// Update profile
profileRouter.post('/', (req, res) => {
  const db: Database = (req as any).db;

  const validation = validateProfile(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  try {
    const profile = db.saveProfile(req.userId!, validation.data);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save profile' });
  }
});
