import { Router } from 'express';
import crypto from 'crypto';
import { Database } from '../database';
import { validateEntry, validateIds } from '../validation';

export const entriesRouter = Router();

function generateId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Get all entries
entriesRouter.get('/', (req, res) => {
  const db: Database = (req as any).db;
  const entries = db.getEntries(req.userId!);
  res.json(entries);
});

// Get last dosage - must be before /:id route
entriesRouter.get('/meta/last-dosage', (req, res) => {
  const db: Database = (req as any).db;
  const dosage = db.getLastDosage(req.userId!);
  res.json({ dosage });
});

// Get single entry
entriesRouter.get('/:id', (req, res) => {
  const db: Database = (req as any).db;
  const entry = db.getEntry(req.params.id, req.userId!);

  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json(entry);
});

// Create or update entry
entriesRouter.post('/', (req, res) => {
  const db: Database = (req as any).db;

  const validation = validateEntry(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  try {
    const entryData = {
      ...validation.data,
      id: validation.data.id || generateId(),
      createdAt: validation.data.createdAt || Date.now()
    };
    const entry = db.saveEntry(entryData, req.userId!);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// Update entry
entriesRouter.put('/:id', (req, res) => {
  const db: Database = (req as any).db;

  const validation = validateEntry({ ...req.body, id: req.params.id });
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  try {
    const entryData = {
      ...validation.data,
      id: req.params.id,
      createdAt: validation.data.createdAt || Date.now()
    };
    const entry = db.saveEntry(entryData, req.userId!);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete single entry
entriesRouter.delete('/:id', (req, res) => {
  const db: Database = (req as any).db;
  const success = db.deleteEntry(req.params.id, req.userId!);

  if (!success) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json({ success: true });
});

// Delete multiple entries
entriesRouter.post('/delete-batch', (req, res) => {
  const db: Database = (req as any).db;

  const validation = validateIds(req.body.ids);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const deletedCount = db.deleteEntries(validation.data, req.userId!);
  res.json({ deletedCount });
});
