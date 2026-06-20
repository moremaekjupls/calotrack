import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { pbkdf2Sync, randomBytes } from 'crypto';
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
  water: number; // daily water goal, ml
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
  water_goal_ml: number;
}

interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

interface DbWaterLog {
  id: string;
  user_id: string;
  date: string;
  ml: number;
  created_at: string;
}

interface WaterLog {
  id: string;
  date: string;
  ml: number;
  createdAt: string;
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
const DEFAULT_GOAL: Goal = { calories: 2000, protein: 150, fat: 65, carbs: 250, water: 2000 };

// ---------------------------------------------------------------------------
// Password hashing (Node.js built-in crypto, no external dep)
// ---------------------------------------------------------------------------

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return hash === verify;
}



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

function rowToWaterLog(row: DbWaterLog): WaterLog {
  return { id: row.id, date: row.date, ml: row.ml, createdAt: row.created_at };
}

function getGoalForUser(userId: string): Goal {
  const row = db
    .prepare('SELECT * FROM goals WHERE user_id = ?')
    .get(userId) as DbGoal | undefined;
  return row
    ? {
        calories: row.calories,
        protein: row.protein,
        fat: row.fat,
        carbs: row.carbs,
        water: row.water_goal_ml ?? 2000,
      }
    : DEFAULT_GOAL;
}

function getWaterTotalForDate(userId: string, date: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(ml), 0) as total FROM water_logs WHERE user_id = ? AND date = ?')
    .get(userId, date) as { total: number };
  return row.total;
}

function computeSummary(entries: Entry[], goal: Goal, date: string, waterConsumed = 0) {
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
    water: { consumed: waterConsumed, goal: goal.water },
    remaining: {
      calories: Math.max(0, goal.calories - totals.calories),
      protein: Math.max(0, goal.protein - totals.protein),
      fat: Math.max(0, goal.fat - totals.fat),
      carbs: Math.max(0, goal.carbs - totals.carbs),
      water: Math.max(0, goal.water - waterConsumed),
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
    `INSERT INTO goals (user_id, calories, protein, fat, carbs, water_goal_ml)
     VALUES (@user_id, @calories, @protein, @fat, @carbs, @water)
     ON CONFLICT(user_id) DO UPDATE SET
       calories=excluded.calories, protein=excluded.protein,
       fat=excluded.fat, carbs=excluded.carbs, water_goal_ml=excluded.water_goal_ml,
       updated_at=datetime('now')`
  ),

  // water
  getWaterLogs: db.prepare<[string, string]>(
    'SELECT * FROM water_logs WHERE user_id = ? AND date = ? ORDER BY created_at'
  ),
  insertWaterLog: db.prepare(
    'INSERT INTO water_logs (id, user_id, date, ml) VALUES (@id, @user_id, @date, @ml)'
  ),
  deleteWaterLog: db.prepare<[string, string]>(
    'DELETE FROM water_logs WHERE id = ? AND user_id = ?'
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
    res.status(401).json({ error: 'Не авторизован' });
    return;
  }

  const session = stmts.getSession.get(token) as { user_id: string } | undefined;
  if (!session) {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Сессия истекла' });
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

  app.use(express.json({ limit: '10mb' })); // base64 meal photos need headroom

  // -------------------------------------------------------------------------
  // Auth routes (no requireAuth middleware)
  // -------------------------------------------------------------------------

  // POST /api/auth/register
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Необходимо указать email и пароль' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: 'Некорректный email' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен содержать не менее 6 символов' });
      return;
    }

    const existing = stmts.getUserByEmail.get(emailLower) as DbUser | undefined;
    if (existing) {
      res.status(409).json({ error: 'Этот email уже зарегистрирован' });
      return;
    }

    const id = `user_${nanoid(12)}`;
    const password_hash = hashPassword(password);

    stmts.insertUser.run({ id, email: emailLower, password_hash });

    const token = nanoid(48);
    const expires_at = new Date(Date.now() + ONE_YEAR_S * 1000).toISOString();
    stmts.insertSession.run({ token, user_id: id, expires_at });

    setAuthCookie(res, token);
    res.status(201).json({ id, email: emailLower });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Необходимо указать email и пароль' });
      return;
    }

    const user = stmts.getUserByEmail.get(email.toLowerCase().trim()) as DbUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Неверный email или пароль' });
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
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    res.json(user);
  });

  // -------------------------------------------------------------------------
  // All routes below require auth
  // -------------------------------------------------------------------------


  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  app.get('/api/admin/users', (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_KEY || 'calotrack-admin-2024';
    if (req.query.key !== adminKey) {
      res.status(403).json({ error: 'Доступ запрещён' });
      return;
    }
    const users = db.prepare(
      `SELECT u.id, u.email, u.created_at,
              COUNT(e.id) as entry_count,
              MAX(e.date) as last_entry_date
       FROM users u
       LEFT JOIN entries e ON e.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    ).all();
    res.json({ count: (users as any[]).length, users });
  });

  app.use('/api', requireAuth);

  // -------------------------------------------------------------------------
  // AI meal photo analysis
  // -------------------------------------------------------------------------

  interface PhotoAnalysisResult {
    name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    confidence?: 'high' | 'medium' | 'low';
    note?: string;
  }

  function extractJson(text: string): any {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  }

  app.post('/api/analyze-meal-photo', async (req: Request, res: Response) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'Анализ фото временно недоступен (не настроен API-ключ)' });
      return;
    }

    const { image, mediaType } = req.body as { image?: string; mediaType?: string };
    if (!image) {
      res.status(400).json({ error: 'Необходимо передать фото (base64) в поле image' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const type = allowedTypes.includes(mediaType || '') ? (mediaType as string) : 'image/jpeg';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: type, data: image },
                },
                {
                  type: 'text',
                  text:
                    'Ты эксперт по питанию. Определи блюдо на фото и оцени его калорийность и БЖУ для порции, ' +
                    'видимой на фото. Если блюд несколько — оцени всё вместе как одну порцию. ' +
                    'Ответь СТРОГО валидным JSON без markdown-разметки и без пояснений вокруг, в формате: ' +
                    '{"name": string на русском, "calories": число, "protein": число (г), "fat": число (г), ' +
                    '"carbs": число (г), "confidence": "high"|"medium"|"low", "note": краткое пояснение оценки на русском}.',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Anthropic API error:', response.status, errText);
        res.status(502).json({ error: 'Не удалось проанализировать фото (ошибка AI-сервиса)' });
        return;
      }

      const data = (await response.json()) as { content: { type: string; text?: string }[] };
      const textBlock = data.content?.find((b) => b.type === 'text');
      if (!textBlock?.text) {
        res.status(502).json({ error: 'AI вернул пустой ответ' });
        return;
      }

      let result: PhotoAnalysisResult;
      try {
        result = extractJson(textBlock.text);
      } catch {
        console.error('Failed to parse AI JSON:', textBlock.text);
        res.status(502).json({ error: 'Не удалось разобрать ответ AI' });
        return;
      }

      if (!result.name || result.calories == null) {
        res.status(502).json({ error: 'AI вернул неполные данные' });
        return;
      }

      res.json({
        name: result.name,
        calories: Math.round(Number(result.calories) || 0),
        protein: Number(result.protein) || 0,
        fat: Number(result.fat) || 0,
        carbs: Number(result.carbs) || 0,
        confidence: result.confidence || 'medium',
        note: result.note || '',
      });
    } catch (err) {
      console.error('Photo analysis error:', err);
      res.status(500).json({ error: 'Внутренняя ошибка при анализе фото' });
    }
  });

  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------

  app.get('/api/entries', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Необходимо указать параметр date (YYYY-MM-DD)' });
      return;
    }
    const rows = stmts.getEntries.all(req.userId, date) as DbEntry[];
    res.json(rows.map(rowToEntry));
  });

  app.post('/api/entries', (req: Request, res: Response) => {
    const { date, name, calories, protein, fat, carbs, mealType, time } =
      req.body as Partial<Entry>;

    if (!date || !name || calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'Необходимо указать date, name, calories, protein, fat, carbs' });
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
      res.status(404).json({ error: 'Запись не найдена' });
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
      res.status(404).json({ error: 'Запись не найдена' });
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
    const { calories, protein, fat, carbs, water } = req.body as Partial<Goal>;
    if (calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'Необходимо указать calories, protein, fat, carbs' });
      return;
    }
    const goal: Goal = {
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      carbs: Number(carbs),
      water: water != null ? Number(water) : getGoalForUser(req.userId).water,
    };
    stmts.upsertGoal.run({ user_id: req.userId, ...goal });
    res.json(goal);
  });

  // -------------------------------------------------------------------------
  // Water
  // -------------------------------------------------------------------------

  app.get('/api/water', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Необходимо указать параметр date (YYYY-MM-DD)' });
      return;
    }
    const rows = stmts.getWaterLogs.all(req.userId, date) as DbWaterLog[];
    const logs = rows.map(rowToWaterLog);
    const total = logs.reduce((sum, l) => sum + l.ml, 0);
    res.json({ date, logs, total });
  });

  app.post('/api/water', (req: Request, res: Response) => {
    const { date, ml } = req.body as { date?: string; ml?: number };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || ml == null || Number(ml) <= 0) {
      res.status(400).json({ error: 'Необходимо указать date (YYYY-MM-DD) и положительное значение ml' });
      return;
    }
    const id = `water_${Date.now()}_${nanoid(9)}`;
    stmts.insertWaterLog.run({ id, user_id: req.userId, date, ml: Number(ml) });
    const total = getWaterTotalForDate(req.userId, date);
    res.status(201).json({ id, date, ml: Number(ml), total });
  });

  app.delete('/api/water/:id', (req: Request, res: Response) => {
    const result = stmts.deleteWaterLog.run(req.params.id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Запись о воде не найдена' });
      return;
    }
    res.status(204).end();
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  app.get('/api/summary', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Необходимо указать параметр date (YYYY-MM-DD)' });
      return;
    }
    const rows = stmts.getEntries.all(req.userId, date) as DbEntry[];
    const waterConsumed = getWaterTotalForDate(req.userId, date);
    res.json(computeSummary(rows.map(rowToEntry), getGoalForUser(req.userId), date, waterConsumed));
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
      res.status(400).json({ error: 'Необходимо указать параметры from и to (YYYY-MM-DD)' });
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    if (diffDays < 0 || diffDays > 90) {
      res.status(400).json({ error: 'Диапазон должен быть от 0 до 90 дней' });
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
