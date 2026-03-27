import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { all, get, run } from './db.js';
import './initDb.js';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';

app.use(cors());
app.use(express.json());

const auth = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET);
    if (roles.length > 0 && !roles.includes(payload.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ message: 'name, email, password are required' });
    return;
  }
  try {
    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users(name, email, password_hash, role) VALUES(?,?,?,?)',
      [name, email, hash, 'applicant']
    );

    const token = jwt.sign({ id: result.lastID, email, role: 'applicant', name }, JWT_SECRET, {
      expiresIn: '7d'
    });
    res.json({ token, user: { id: result.lastID, name, email, role: 'applicant' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/me', auth(), async (req, res) => {
  const user = await get('SELECT id, name, email, role FROM users WHERE id=?', [req.user.id]);
  res.json(user);
});

app.post('/api/proposals', auth(['applicant']), async (req, res) => {
  const result = await run('INSERT INTO proposals(applicant_id) VALUES(?)', [req.user.id]);
  const proposal = await get('SELECT * FROM proposals WHERE id=?', [result.lastID]);
  res.json(proposal);
});

app.get('/api/proposals', auth(), async (req, res) => {
  const { role, id } = req.user;
  let rows = [];
  if (role === 'applicant') {
    rows = await all(
      `SELECT p.*, u.name AS reviewer_name
       FROM proposals p
       LEFT JOIN users u ON p.assigned_reviewer_id = u.id
       WHERE applicant_id = ? ORDER BY p.updated_at DESC`,
      [id]
    );
  } else if (role === 'reviewer') {
    rows = await all(
      `SELECT p.*, a.name AS applicant_name
       FROM proposals p
       JOIN users a ON p.applicant_id = a.id
       WHERE assigned_reviewer_id = ? ORDER BY p.updated_at DESC`,
      [id]
    );
  } else {
    rows = await all(
      `SELECT p.*, a.name AS applicant_name, r.name AS reviewer_name
       FROM proposals p
       JOIN users a ON p.applicant_id = a.id
       LEFT JOIN users r ON p.assigned_reviewer_id = r.id
       ORDER BY p.updated_at DESC`
    );
  }
  res.json(rows);
});

app.get('/api/proposals/:id', auth(), async (req, res) => {
  const proposal = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  if (!proposal) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const { role, id } = req.user;
  const canView =
    role === 'admin' ||
    proposal.applicant_id === id ||
    (role === 'reviewer' && proposal.assigned_reviewer_id === id);

  if (!canView) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const reviews = await all(
    `SELECT rv.*, u.name AS reviewer_name
     FROM reviews rv JOIN users u ON u.id = rv.reviewer_id
     WHERE proposal_id = ?`,
    [req.params.id]
  );
  res.json({ ...proposal, reviews });
});

app.put('/api/proposals/:id', auth(['applicant']), async (req, res) => {
  const proposal = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  if (!proposal || proposal.applicant_id !== req.user.id) {
    res.status(404).json({ message: 'Proposal not found' });
    return;
  }

  const allowed = [
    'title',
    'summary',
    'problem_statement',
    'approach',
    'budget',
    'timeline'
  ];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }
  if (updates.length === 0) {
    res.status(400).json({ message: 'No changes provided' });
    return;
  }

  params.push(req.params.id);
  await run(
    `UPDATE proposals SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
  const updated = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  res.json(updated);
});

app.post('/api/proposals/:id/submit', auth(['applicant']), async (req, res) => {
  const proposal = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  if (!proposal || proposal.applicant_id !== req.user.id) {
    res.status(404).json({ message: 'Proposal not found' });
    return;
  }

  if (!proposal.title || !proposal.summary || !proposal.problem_statement || !proposal.approach) {
    res.status(400).json({ message: 'Please complete required fields before submit.' });
    return;
  }

  await run(
    "UPDATE proposals SET status='submitted', submitted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id = ?",
    [req.params.id]
  );
  const updated = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  res.json(updated);
});

app.get('/api/admin/reviewers', auth(['admin']), async (_req, res) => {
  const reviewers = await all('SELECT id, name, email FROM users WHERE role = ?', ['reviewer']);
  res.json(reviewers);
});

app.post('/api/admin/proposals/:id/assign', auth(['admin']), async (req, res) => {
  const { reviewerId } = req.body;
  const proposal = await get('SELECT * FROM proposals WHERE id=?', [req.params.id]);
  if (!proposal) {
    res.status(404).json({ message: 'Proposal not found' });
    return;
  }

  const reviewer = await get('SELECT id FROM users WHERE id = ? AND role = ?', [reviewerId, 'reviewer']);
  if (!reviewer) {
    res.status(400).json({ message: 'Reviewer not found' });
    return;
  }

  await run(
    "UPDATE proposals SET assigned_reviewer_id=?, status='under_review', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [reviewerId, req.params.id]
  );
  res.json(await get('SELECT * FROM proposals WHERE id=?', [req.params.id]));
});

app.post('/api/admin/proposals/:id/status', auth(['admin']), async (req, res) => {
  const { status, adminComment } = req.body;
  const allowed = ['changes_requested', 'approved', 'rejected'];
  if (!allowed.includes(status)) {
    res.status(400).json({ message: 'Invalid status' });
    return;
  }
  await run(
    'UPDATE proposals SET status=?, admin_comment=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [status, adminComment || null, req.params.id]
  );
  res.json(await get('SELECT * FROM proposals WHERE id=?', [req.params.id]));
});

app.post('/api/reviewer/proposals/:id/review', auth(['reviewer']), async (req, res) => {
  const { scoreClarity, scoreFeasibility, scoreImpact, comments } = req.body;
  const proposal = await get('SELECT * FROM proposals WHERE id = ?', [req.params.id]);
  if (!proposal || proposal.assigned_reviewer_id !== req.user.id) {
    res.status(404).json({ message: 'Assigned proposal not found' });
    return;
  }

  await run(
    `INSERT INTO reviews(proposal_id, reviewer_id, score_clarity, score_feasibility, score_impact, comments)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(proposal_id, reviewer_id) DO UPDATE SET
       score_clarity = excluded.score_clarity,
       score_feasibility = excluded.score_feasibility,
       score_impact = excluded.score_impact,
       comments = excluded.comments,
       created_at = CURRENT_TIMESTAMP`,
    [req.params.id, req.user.id, scoreClarity, scoreFeasibility, scoreImpact, comments || null]
  );

  res.json(await get('SELECT * FROM reviews WHERE proposal_id=? AND reviewer_id=?', [req.params.id, req.user.id]));
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
