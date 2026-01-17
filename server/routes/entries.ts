import { Router } from 'express';
import { Database } from '../database';

export const entriesRouter = Router();

// Get all entries
entriesRouter.get('/', (req, res) => {
  const db: Database = (req as any).db;
  const entries = db.getEntries();
  res.json(entries);
});

// Get single entry
entriesRouter.get('/:id', (req, res) => {
  const db: Database = (req as any).db;
  const entry = db.getEntry(req.params.id);

  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json(entry);
});

// Create or update entry
entriesRouter.post('/', (req, res) => {
  const db: Database = (req as any).db;

  try {
    const entry = db.saveEntry(req.body);
    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to save entry' });
  }
});

// Update entry
entriesRouter.put('/:id', (req, res) => {
  const db: Database = (req as any).db;

  try {
    const entry = db.saveEntry({ ...req.body, id: req.params.id });
    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update entry' });
  }
});

// Delete single entry
entriesRouter.delete('/:id', (req, res) => {
  const db: Database = (req as any).db;
  const success = db.deleteEntry(req.params.id);

  if (!success) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json({ success: true });
});

// Delete multiple entries
entriesRouter.post('/delete-batch', (req, res) => {
  const db: Database = (req as any).db;
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  const deletedCount = db.deleteEntries(ids);
  res.json({ deletedCount });
});

// Get last dosage
entriesRouter.get('/meta/last-dosage', (req, res) => {
  const db: Database = (req as any).db;
  const dosage = db.getLastDosage();
  res.json({ dosage });
});
