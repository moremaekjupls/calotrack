import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entry {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType?: string;
  time?: string;
}

interface Goal {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface DbEntry {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  meal_type: string | null;
  time: string | null;
}

interface DbGoal {
  user_id: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_COOKIE = 'ct_auth';
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const DEFAULT_GOAL: Goal = { calories: 2000, protein: 150, fat: 65, carbs: 250 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())])
  );
}

function setAuthCookie(res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${AUTH_COOKIE}=${token}; Max-Age=${ONE_YEAR_S}; Path=/; HttpOnly; SameSite=Lax`
  );
}

function clearAuthCookie(res: Response) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

function rowToEntry(row: DbEntry): Entry {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    ...(row.meal_type ? { mealType: row.meal_type } : {}),
    ...(row.time ? { time: row.time } : {}),
  };
}

function getGoalForUser(userId: string): Goal {
  const row = db
    .prepare('SELECT * FROM goals WHERE user_id = ?')
    .get(userId) as DbGoal | undefined;
  return row
    ? { calories: row.calories, protein: row.protein, fat: row.fat, carbs: row.carbs }
    : DEFAULT_GOAL;
}

function computeSummary(entries: Entry[], goal: Goal, date: string) {
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return {
    date,
    entries,
    totals,
    goal,
    remaining: {
      calories: Math.max(0, goal.calories - totals.calories),
      protein: Math.max(0, goal.protein - totals.protein),
      fat: Math.max(0, goal.fat - totals.fat),
      carbs: Math.max(0, goal.carbs - totals.carbs),
    },
    isOverGoal: {
      calories: totals.calories > goal.calories,
      protein: totals.protein > goal.protein,
      fat: totals.fat > goal.fat,
      carbs: totals.carbs > goal.carbs,
    },
  };
}

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  // auth
  getUserByEmail: db.prepare<[string]>('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare<[string]>('SELECT id, email, created_at FROM users WHERE id = ?'),
  insertUser: db.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (@id, @email, @password_hash)'
  ),
  insertSession: db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (@token, @user_id, @expires_at)'
  ),
  getSession: db.prepare<[string]>(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ),
  deleteSession: db.prepare<[string]>('DELETE FROM sessions WHERE token = ?'),

  // entries
  getEntries: db.prepare<[string, string]>(
    "SELECT * FROM entries WHERE user_id = ? AND date = ? ORDER BY COALESCE(time, '99:99'), id"
  ),
  getEntry: db.prepare<[string, string]>(
    'SELECT * FROM entries WHERE id = ? AND user_id = ?'
  ),
  insertEntry: db.prepare(
    `INSERT INTO entries (id, user_id, date, name, calories, protein, fat, carbs, meal_type, time)
     VALUES (@id, @user_id, @date, @name, @calories, @protein, @fat, @carbs, @meal_type, @time)`
  ),
  updateEntry: db.prepare(
    `UPDATE entries SET name=@name, calories=@calories, protein=@protein, fat=@fat,
     carbs=@carbs, meal_type=@meal_type, time=@time, date=@date
     WHERE id=@id AND user_id=@user_id`
  ),
  deleteEntry: db.prepare<[string, string]>(
    'DELETE FROM entries WHERE id = ? AND user_id = ?'
  ),

  // goal
  upsertGoal: db.prepare(
    `INSERT INTO goals (user_id, calories, protein, fat, carbs)
     VALUES (@user_id, @calories, @protein, @fat, @carbs)
     ON CONFLICT(user_id) DO UPDATE SET
       calories=excluded.calories, protein=excluded.protein,
       fat=excluded.fat, carbs=excluded.carbs,
       updated_at=datetime('now')`
  ),

  // recent / frequent foods
  recentFoods: db.prepare<[string, number]>(
    `SELECT DISTINCT name, calories, protein, fat, carbs, meal_type
     FROM entries
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ),
  frequentFoods: db.prepare<[string, number]>(
    `SELECT name, calories, protein, fat, carbs, meal_type, COUNT(*) as count
     FROM entries
     WHERE user_id = ?
     GROUP BY name
     ORDER BY count DESC
     LIMIT ?`
  ),

  // history
  entriesForRange: db.prepare<[string, string, string]>(
    `SELECT * FROM entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, COALESCE(time, '99:99'), id`
  ),
};

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[AUTH_COOKIE];

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = stmts.getSession.get(token) as { user_id: string } | undefined;
  if (!session) {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.userId = session.user_id;
  next();
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // -------------------------------------------------------------------------
  // Auth routes (no requireAuth middleware)
  // -------------------------------------------------------------------------

  // POST /api/auth/register
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = stmts.getUserByEmail.get(emailLower) as DbUser | undefined;
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const id = `user_${nanoid(12)}`;
    const password_hash = await bcrypt.hash(password, 10);

    stmts.insertUser.run({ id, email: emailLower, password_hash });

    const token = nanoid(48);
    const expires_at = new Date(Date.now() + ONE_YEAR_S * 1000).toISOString();
    stmts.insertSession.run({ token, user_id: id, expires_at });

    setAuthCookie(res, token);
    res.status(201).json({ id, email: emailLower });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }

    const user = stmts.getUserByEmail.get(email.toLowerCase().trim()) as DbUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = nanoid(48);
    const expires_at = new Date(Date.now() + ONE_YEAR_S * 1000).toISOString();
    stmts.insertSession.run({ token, user_id: user.id, expires_at });

    setAuthCookie(res, token);
    res.status(200).json({ id: user.id, email: user.email });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[AUTH_COOKIE];
    if (token) stmts.deleteSession.run(token);
    clearAuthCookie(res);
    res.status(204).end();
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
    const user = stmts.getUserById.get(req.userId) as { id: string; email: string } | undefined;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  });

  // -------------------------------------------------------------------------
  // All routes below require auth
  // -------------------------------------------------------------------------

  app.use('/api', requireAuth);

  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------

  app.get('/api/entries', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      return;
    }
    const rows = stmts.getEntries.all(req.userId, date) as DbEntry[];
    res.json(rows.map(rowToEntry));
  });

  app.post('/api/entries', (req: Request, res: Response) => {
    const { date, name, calories, protein, fat, carbs, mealType, time } =
      req.body as Partial<Entry>;

    if (!date || !name || calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'date, name, calories, protein, fat, carbs are required' });
      return;
    }

    const id = `entry_${Date.now()}_${nanoid(9)}`;
    stmts.insertEntry.run({
      id,
      user_id: req.userId,
      date,
      name,
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      carbs: Number(carbs),
      meal_type: mealType ?? null,
      time: time ?? null,
    });

    const row = stmts.getEntry.get(id, req.userId) as DbEntry;
    res.status(201).json(rowToEntry(row));
  });

  app.put('/api/entries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = stmts.getEntry.get(id, req.userId) as DbEntry | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    const body = req.body as Partial<Entry>;
    stmts.updateEntry.run({
      id,
      user_id: req.userId,
      date: body.date ?? existing.date,
      name: body.name ?? existing.name,
      calories: body.calories != null ? Number(body.calories) : existing.calories,
      protein: body.protein != null ? Number(body.protein) : existing.protein,
      fat: body.fat != null ? Number(body.fat) : existing.fat,
      carbs: body.carbs != null ? Number(body.carbs) : existing.carbs,
      meal_type: body.mealType !== undefined ? (body.mealType ?? null) : existing.meal_type,
      time: body.time !== undefined ? (body.time ?? null) : existing.time,
    });

    const updated = stmts.getEntry.get(id, req.userId) as DbEntry;
    res.json(rowToEntry(updated));
  });

  app.delete('/api/entries/:id', (req: Request, res: Response) => {
    const result = stmts.deleteEntry.run(req.params.id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.status(204).end();
  });

  // -------------------------------------------------------------------------
  // Goal
  // -------------------------------------------------------------------------

  app.get('/api/goal', (req: Request, res: Response) => {
    res.json(getGoalForUser(req.userId));
  });

  app.put('/api/goal', (req: Request, res: Response) => {
    const { calories, protein, fat, carbs } = req.body as Partial<Goal>;
    if (calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'calories, protein, fat, carbs are required' });
      return;
    }
    const goal: Goal = {
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      carbs: Number(carbs),
    };
    stmts.upsertGoal.run({ user_id: req.userId, ...goal });
    res.json(goal);
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  app.get('/api/summary', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      return;
    }
    const rows = stmts.getEntries.all(req.userId, date) as DbEntry[];
    res.json(computeSummary(rows.map(rowToEntry), getGoalForUser(req.userId), date));
  });

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  app.get('/api/history', (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    if (
      !from || !to ||
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {
      res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' });
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    if (diffDays < 0 || diffDays > 90) {
      res.status(400).json({ error: 'Range must be 0–90 days' });
      return;
    }

    const rows = stmts.entriesForRange.all(req.userId, from, to) as DbEntry[];
    const goal = getGoalForUser(req.userId);

    // Build map date -> entries
    const byDate = new Map<string, Entry[]>();
    for (const row of rows) {
      if (!byDate.has(row.date)) byDate.set(row.date, []);
      byDate.get(row.date)!.push(rowToEntry(row));
    }

    // Fill every day in range
    const result = [];
    const cur = new Date(fromDate);
    while (cur <= toDate) {
      const dateStr = cur.toISOString().slice(0, 10);
      result.push(computeSummary(byDate.get(dateStr) ?? [], goal, dateStr));
      cur.setDate(cur.getDate() + 1);
    }

    res.json(result);
  });

  // -------------------------------------------------------------------------
  // Recent / Frequent foods
  // -------------------------------------------------------------------------

  app.get('/api/foods/recent', (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 10, 20);
    const rows = stmts.recentFoods.all(req.userId, limit) as any[];
    res.json(rows.map((r) => ({
      name: r.name,
      calories: r.calories,
      protein: r.protein,
      fat: r.fat,
      carbs: r.carbs,
      mealType: r.meal_type,
    })));
  });

  app.get('/api/foods/frequent', (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 5, 10);
    const rows = stmts.frequentFoods.all(req.userId, limit) as any[];
    res.json(rows.map((r) => ({
      name: r.name,
      calories: r.calories,
      protein: r.protein,
      fat: r.fat,
      carbs: r.carbs,
      mealType: r.meal_type,
      count: r.count,
    })));
  });

  // -------------------------------------------------------------------------
  // Static frontend
  // -------------------------------------------------------------------------

  const staticPath = path.resolve(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // -------------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------------

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`CaloTrack server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
