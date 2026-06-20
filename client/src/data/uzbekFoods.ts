/**
 * Популярные блюда узбекской кухни — быстрый выбор без ручного ввода.
 * Калории и БЖУ — усреднённые значения на стандартную порцию.
 */

import type { MealType } from '@/types';

export interface PresetFood {
  emoji: string;
  name: string;
  portion: string; // human-readable serving description
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType?: MealType;
}

export const uzbekFoods: PresetFood[] = [
  { emoji: '🍚', name: 'Плов', portion: '350 г', calories: 650, protein: 22, fat: 28, carbs: 70, mealType: 'lunch' },
  { emoji: '🥟', name: 'Манты (4 шт)', portion: '4 шт', calories: 420, protein: 18, fat: 20, carbs: 38, mealType: 'lunch' },
  { emoji: '🍜', name: 'Лагман', portion: '400 г', calories: 480, protein: 20, fat: 16, carbs: 58, mealType: 'lunch' },
  { emoji: '🍲', name: 'Шурпа', portion: '350 г', calories: 320, protein: 18, fat: 14, carbs: 28, mealType: 'lunch' },
  { emoji: '🍢', name: 'Шашлык из баранины', portion: '200 г', calories: 430, protein: 32, fat: 32, carbs: 2, mealType: 'dinner' },
  { emoji: '🥧', name: 'Самса', portion: '1 шт', calories: 290, protein: 9, fat: 18, carbs: 22, mealType: 'snack' },
  { emoji: '🫓', name: 'Нон (лепёшка)', portion: '1 шт', calories: 280, protein: 8, fat: 2, carbs: 56, mealType: 'snack' },
  { emoji: '🥣', name: 'Чучвара', portion: '350 г', calories: 380, protein: 16, fat: 14, carbs: 48, mealType: 'lunch' },
  { emoji: '🍛', name: 'Дымляма', portion: '350 г', calories: 340, protein: 16, fat: 18, carbs: 30, mealType: 'dinner' },
  { emoji: '🥗', name: 'Ачичук (салат)', portion: '200 г', calories: 60, protein: 2, fat: 0.3, carbs: 12, mealType: 'snack' },
  { emoji: '🌾', name: 'Сумаляк', portion: '150 г', calories: 210, protein: 3, fat: 1, carbs: 48, mealType: 'snack' },
  { emoji: '🍯', name: 'Чак-чак', portion: '100 г', calories: 410, protein: 6, fat: 18, carbs: 56, mealType: 'snack' },
  { emoji: '🥛', name: 'Айран/кефир', portion: '250 мл', calories: 110, protein: 6, fat: 6, carbs: 8, mealType: 'snack' },
  { emoji: '🍈', name: 'Дыня', portion: '300 г', calories: 90, protein: 1.5, fat: 0.3, carbs: 21, mealType: 'snack' },
  { emoji: '🍇', name: 'Виноград', portion: '200 г', calories: 130, protein: 1.3, fat: 0.3, carbs: 32, mealType: 'snack' },
  { emoji: '☕', name: 'Чай зелёный с сахаром', portion: '250 мл', calories: 40, protein: 0, fat: 0, carbs: 10, mealType: 'snack' },
];
