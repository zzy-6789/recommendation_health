import bcrypt from 'bcryptjs';
import { run, get } from './db.js';

const init = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('applicant', 'reviewer', 'admin')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id INTEGER NOT NULL,
    title TEXT,
    summary TEXT,
    problem_statement TEXT,
    approach TEXT,
    budget TEXT,
    timeline TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
      'draft','submitted','under_review','changes_requested','approved','rejected'
    )),
    assigned_reviewer_id INTEGER,
    admin_comment TEXT,
    submitted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(applicant_id) REFERENCES users(id),
    FOREIGN KEY(assigned_reviewer_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    score_clarity INTEGER NOT NULL,
    score_feasibility INTEGER NOT NULL,
    score_impact INTEGER NOT NULL,
    comments TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, reviewer_id),
    FOREIGN KEY(proposal_id) REFERENCES proposals(id),
    FOREIGN KEY(reviewer_id) REFERENCES users(id)
  )`);

  const adminEmail = 'admin@demo.com';
  const reviewerEmail = 'reviewer@demo.com';

  const admin = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!admin) {
    const hash = await bcrypt.hash('Admin123!', 10);
    await run('INSERT INTO users(name, email, password_hash, role) VALUES(?,?,?,?)', [
      'System Admin',
      adminEmail,
      hash,
      'admin'
    ]);
  }

  const reviewer = await get('SELECT id FROM users WHERE email = ?', [reviewerEmail]);
  if (!reviewer) {
    const hash = await bcrypt.hash('Reviewer123!', 10);
    await run('INSERT INTO users(name, email, password_hash, role) VALUES(?,?,?,?)', [
      'Default Reviewer',
      reviewerEmail,
      hash,
      'reviewer'
    ]);
  }

  console.log('Database initialized.');
  console.log('Admin: admin@demo.com / Admin123!');
  console.log('Reviewer: reviewer@demo.com / Reviewer123!');
};

init().catch((error) => {
  console.error('Failed to initialize DB', error);
  process.exit(1);
});
