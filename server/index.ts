import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import db from './db.js';
import { COOKIE_NAME, ONE_YEAR_MS } from '../shared/const.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Entry {
  id: string; date: string; name: string;
  calories: number; protein: number; fat: number; carbs: number;
  mealType?: string; time?: string;
}
interface Goal { calories: number; protein: number; fat: number; carbs: number; }
interface DbEntry {
  id: string; session_id: string; date: string; name: string;
  calories: number; protein: number; fat: number; carbs: number;
  meal_type: string | null; time: string | null;
}
interface DbGoal { session_id: string; calories: number; protein: number; fat: number; carbs: number; }

declare global { namespace Express { interface Request { sessionId: string; } } }

const DEFAULT_GOAL: Goal = { calories: 2000, protein: 150, fat: 65, carbs: 250 };

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=')).filter(p => p.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())])
  );
}

function rowToEntry(row: DbEntry): Entry {
  return {
    id: row.id, date: row.date, name: row.name,
    calories: row.calories, protein: row.protein, fat: row.fat, carbs: row.carbs,
    ...(row.meal_type ? { mealType: row.meal_type } : {}),
    ...(row.time ? { time: row.time } : {}),
  };
}

function getGoalForSession(sessionId: string): Goal {
  const row = db.prepare('SELECT * FROM goals WHERE session_id = ?').get(sessionId) as DbGoal | undefined;
  return row ? { calories: row.calories, protein: row.protein, fat: row.fat, carbs: row.carbs } : DEFAULT_GOAL;
}

function computeSummary(entries: Entry[], goal: Goal, date: string) {
  const totals = entries.reduce(
    (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, fat: acc.fat + e.fat, carbs: acc.carbs + e.carbs }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
  return {
    date, entries, totals, goal,
    remaining: {
      calories: Math.max(0, goal.calories - totals.calories),
      protein: Math.max(0, goal.protein - totals.protein),
      fat: Math.max(0, goal.fat - totals.fat),
      carbs: Math.max(0, goal.carbs - totals.carbs),
    },
    isOverGoal: {
      calories: totals.calories > goal.calories, protein: totals.protein > goal.protein,
      fat: totals.fat > goal.fat, carbs: totals.carbs > goal.carbs,
    },
  };
}

const stmts = {
  getEntries: db.prepare<[string, string]>(
    "SELECT * FROM entries WHERE session_id = ? AND date = ? ORDER BY COALESCE(time, '99:99'), id"
  ),
  getEntry: db.prepare<[string, string]>('SELECT * FROM entries WHERE id = ? AND session_id = ?'),
  insertEntry: db.prepare(
    `INSERT INTO entries (id, session_id, date, name, calories, protein, fat, carbs, meal_type, time)
     VALUES (@id, @session_id, @date, @name, @calories, @protein, @fat, @carbs, @meal_type, @time)`
  ),
  updateEntry: db.prepare(
    `UPDATE entries SET name=@name, calories=@calories, protein=@protein, fat=@fat,
     carbs=@carbs, meal_type=@meal_type, time=@time, date=@date
     WHERE id=@id AND session_id=@session_id`
  ),
  deleteEntry: db.prepare<[string, string]>('DELETE FROM entries WHERE id = ? AND session_id = ?'),
  upsertGoal: db.prepare(
    `INSERT INTO goals (session_id, calories, protein, fat, carbs)
     VALUES (@session_id, @calories, @protein, @fat, @carbs)
     ON CONFLICT(session_id) DO UPDATE SET
       calories=excluded.calories, protein=excluded.protein,
       fat=excluded.fat, carbs=excluded.carbs, updated_at=datetime('now')`
  ),
  entriesForRange: db.prepare<[string, string, string]>(
    "SELECT * FROM entries WHERE session_id = ? AND date >= ? AND date <= ? ORDER BY date, COALESCE(time, '99:99'), id"
  ),
  recentFoods: db.prepare<[string, number]>(
    `SELECT name, calories, protein, fat, carbs, meal_type
     FROM entries WHERE session_id = ?
     GROUP BY name ORDER BY MAX(created_at) DESC LIMIT ?`
  ),
  frequentFoods: db.prepare<[string, number]>(
    `SELECT name, calories, protein, fat, carbs, meal_type, COUNT(*) as count
     FROM entries WHERE session_id = ?
     GROUP BY name ORDER BY count DESC LIMIT ?`
  ),
};

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const cookies = parseCookies(req.headers.cookie || '');
    let sessionId = cookies[COOKIE_NAME];
    if (!sessionId) {
      sessionId = nanoid();
      res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${sessionId}; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax`
      );
    }
    req.sessionId = sessionId;
    next();
  });

  // Entries CRUD
  app.get('/api/entries', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date required (YYYY-MM-DD)' }); return;
    }
    res.json((stmts.getEntries.all(req.sessionId, date) as DbEntry[]).map(rowToEntry));
  });

  app.post('/api/entries', (req: Request, res: Response) => {
    const { date, name, calories, protein, fat, carbs, mealType, time } = req.body as Partial<Entry>;
    if (!date || !name || calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'date, name, calories, protein, fat, carbs required' }); return;
    }
    const id = `entry_${Date.now()}_${nanoid(9)}`;
    stmts.insertEntry.run({ id, session_id: req.sessionId, date, name,
      calories: Number(calories), protein: Number(protein), fat: Number(fat), carbs: Number(carbs),
      meal_type: mealType ?? null, time: time ?? null });
    res.status(201).json(rowToEntry(stmts.getEntry.get(id, req.sessionId) as DbEntry));
  });

  app.put('/api/entries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = stmts.getEntry.get(id, req.sessionId) as DbEntry | undefined;
    if (!existing) { res.status(404).json({ error: 'Entry not found' }); return; }
    const body = req.body as Partial<Entry>;
    stmts.updateEntry.run({
      id, session_id: req.sessionId,
      date: body.date ?? existing.date, name: body.name ?? existing.name,
      calories: body.calories != null ? Number(body.calories) : existing.calories,
      protein: body.protein != null ? Number(body.protein) : existing.protein,
      fat: body.fat != null ? Number(body.fat) : existing.fat,
      carbs: body.carbs != null ? Number(body.carbs) : existing.carbs,
      meal_type: body.mealType !== undefined ? (body.mealType ?? null) : existing.meal_type,
      time: body.time !== undefined ? (body.time ?? null) : existing.time,
    });
    res.json(rowToEntry(stmts.getEntry.get(id, req.sessionId) as DbEntry));
  });

  app.delete('/api/entries/:id', (req: Request, res: Response) => {
    const result = stmts.deleteEntry.run(req.params.id, req.sessionId);
    if (result.changes === 0) { res.status(404).json({ error: 'Entry not found' }); return; }
    res.status(204).end();
  });

  // Goal
  app.get('/api/goal', (req: Request, res: Response) => res.json(getGoalForSession(req.sessionId)));
  app.put('/api/goal', (req: Request, res: Response) => {
    const { calories, protein, fat, carbs } = req.body as Partial<Goal>;
    if (calories == null || protein == null || fat == null || carbs == null) {
      res.status(400).json({ error: 'calories, protein, fat, carbs required' }); return;
    }
    const goal = { calories: Number(calories), protein: Number(protein), fat: Number(fat), carbs: Number(carbs) };
    stmts.upsertGoal.run({ session_id: req.sessionId, ...goal });
    res.json(goal);
  });

  // Summary (single day)
  app.get('/api/summary', (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date required (YYYY-MM-DD)' }); return;
    }
    const entries = (stmts.getEntries.all(req.sessionId, date) as DbEntry[]).map(rowToEntry);
    res.json(computeSummary(entries, getGoalForSession(req.sessionId), date));
  });

  // History (date range) — for dashboard
  app.get('/api/history', (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      res.status(400).json({ error: 'from and to required (YYYY-MM-DD)' }); return;
    }
    // Clamp range to 90 days max
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000);
    if (diffDays < 0 || diffDays > 90) {
      res.status(400).json({ error: 'range must be 1–90 days' }); return;
    }

    const goal = getGoalForSession(req.sessionId);
    const allRows = stmts.entriesForRange.all(req.sessionId, from, to) as DbEntry[];

    // Group by date
    const byDate = new Map<string, DbEntry[]>();
    for (const row of allRows) {
      if (!byDate.has(row.date)) byDate.set(row.date, []);
      byDate.get(row.date)!.push(row);
    }

    // Build one summary per day in the range (including empty days)
    const summaries = [];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const entries = (byDate.get(dateStr) || []).map(rowToEntry);
      summaries.push(computeSummary(entries, goal, dateStr));
    }

    res.json(summaries);
  });

  // Quick-add foods
  app.get('/api/foods/recent', (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 10, 30);
    res.json((stmts.recentFoods.all(req.sessionId, limit) as any[]).map(r => ({
      name: r.name, calories: r.calories, protein: r.protein, fat: r.fat, carbs: r.carbs, mealType: r.meal_type,
    })));
  });

  app.get('/api/foods/frequent', (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    res.json((stmts.frequentFoods.all(req.sessionId, limit) as any[]).map(r => ({
      name: r.name, calories: r.calories, protein: r.protein, fat: r.fat, carbs: r.carbs,
      mealType: r.meal_type, count: r.count,
    })));
  });

  // Static
  const staticPath = path.resolve(__dirname, 'public');
  app.use(express.static(staticPath));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(staticPath, 'index.html')));

  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`CaloTrack running on http://localhost:${port}/`));
}

startServer().catch(console.error);
