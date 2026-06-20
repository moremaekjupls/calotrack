export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Entry {
  id: string;
  date: string;        // YYYY-MM-DD
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType?: MealType;
  time?: string;       // HH:MM
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
}

export interface Goal {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;       // daily goal, ml
}

export interface WaterLog {
  id: string;
  date: string;
  ml: number;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  entries: Entry[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  goal: Goal;
  water: { consumed: number; goal: number };
  remaining: { calories: number; protein: number; fat: number; carbs: number; water: number };
  isOverGoal: { calories: boolean; protein: boolean; fat: boolean; carbs: boolean };
}
