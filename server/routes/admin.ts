import { Router } from 'express';
import { Database } from '../database';
import { sendInvite } from '../services/email';

export const adminRouter = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// GET /api/admin/users - List all users
adminRouter.get('/users', (req, res) => {
  const db: Database = (req as any).db;
  const users = db.getAllUsers();

  // Return safe user data (no secrets)
  const safeUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }));

  res.json(safeUsers);
});

// POST /api/admin/invites - Create invite
adminRouter.post('/invites', async (req, res) => {
  const { email, role = 'user' } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ error: 'Role must be "user" or "admin"' });
  }

  const db: Database = (req as any).db;

  // Check if user already exists
  if (db.findUserByEmail(email)) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Check if invite already exists
  const existingInvite = db.findInviteByEmail(email);
  if (existingInvite) {
    return res.status(400).json({ error: 'Invite already sent to this email' });
  }

  const invite = db.createInvite({
    email,
    role,
    invitedBy: req.userId!,
  });

  const inviter = db.findUserById(req.userId!);
  const inviteUrl = `${APP_URL}?invite=${invite.token}`;

  await sendInvite(email, inviteUrl, inviter?.name || 'An admin');

  res.json({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
});

// DELETE /api/admin/users/:id - Delete user
adminRouter.delete('/users/:id', (req, res) => {
  const db: Database = (req as any).db;

  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.deleteUser(req.params.id);
  res.json({ success: true });
});

// PUT /api/admin/users/:id/role - Update user role
adminRouter.put('/users/:id/role', (req, res) => {
  const { role } = req.body;

  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ error: 'Role must be "user" or "admin"' });
  }

  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  const db: Database = (req as any).db;
  const user = db.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.updateUser(req.params.id, { role });

  res.json({ success: true });
});
