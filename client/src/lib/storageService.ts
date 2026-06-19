import { Entry, Goal, DailySummary } from '@/types';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}`);
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function getEntries(date: string): Promise<Entry[]> {
  return apiFetch<Entry[]>(`/api/entries?date=${encodeURIComponent(date)}`);
}
export async function addEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
  return apiFetch<Entry>('/api/entries', { method: 'POST', body: JSON.stringify(entry) });
}
export async function updateEntry(id: string, updates: Partial<Entry>): Promise<Entry | null> {
  return apiFetch<Entry>(`/api/entries/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
}
export async function deleteEntry(id: string): Promise<boolean> {
  await apiFetch<void>(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}
export async function getGoal(): Promise<Goal> { return apiFetch<Goal>('/api/goal'); }
export async function setGoal(goal: Goal): Promise<Goal> {
  return apiFetch<Goal>('/api/goal', { method: 'PUT', body: JSON.stringify(goal) });
}
export async function getDailySummary(date: string): Promise<DailySummary> {
  return apiFetch<DailySummary>(`/api/summary?date=${encodeURIComponent(date)}`);
}
export async function getHistory(from: string, to: string): Promise<DailySummary[]> {
  return apiFetch<DailySummary[]>(`/api/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export interface QuickFood {
  name: string; calories: number; protein: number; fat: number; carbs: number;
  mealType?: string; count?: number;
}
export async function getRecentFoods(limit = 10): Promise<QuickFood[]> {
  return apiFetch<QuickFood[]>(`/api/foods/recent?limit=${limit}`);
}
export async function getFrequentFoods(limit = 5): Promise<QuickFood[]> {
  return apiFetch<QuickFood[]>(`/api/foods/frequent?limit=${limit}`);
}

export async function exportAllData() {
  const [goal, today] = await Promise.all([getGoal(), getEntries(new Date().toISOString().slice(0, 10))]);
  return { entries: today, goal };
}
export async function clearAllData() { console.warn('not implemented'); }
export async function deleteEntriesForDate(date: string) {
  const entries = await getEntries(date);
  await Promise.all(entries.map(e => deleteEntry(e.id)));
  return entries.length;
}
