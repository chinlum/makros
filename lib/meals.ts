export const MAIN_MEALS = ['breakfast', 'brunch', 'lunch', 'dinner', 'supper'] as const;
export const ITEMIZED = ['snack', 'protein_shake'] as const;
export const MEAL_TYPES = [...MAIN_MEALS, ...ITEMIZED] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', brunch: 'Brunch', lunch: 'Lunch', dinner: 'Dinner',
  supper: 'Supper', snack: 'Snack', protein_shake: 'Protein shake',
};
