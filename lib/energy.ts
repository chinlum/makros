import { dayLabel } from './dates';

export type Profile = {
  sex: 'male' | 'female';
  birth_year: number;
  height_cm: number;
  weight_kg: number;
  activity_level: string | null;
  custom_step_default: number;
};

// Tunable constants
export const NON_EXERCISE_FACTOR = 1.2;           // BMR x 1.2; steps and workouts are added separately
export const STEP_KCAL_PER_KG_PER_STEP = 0.0005;  // 70 kg x 5,000 steps = 175 kcal

// Helper to calculate current age dynamically from birth_year
export const calcAge = (birthYear: number) =>
  Math.max(10, new Date().getFullYear() - (Number(birthYear) || new Date().getFullYear()));

// Mifflin-St Jeor, metric.
export function bmr(p: Pick<Profile, 'sex' | 'birth_year' | 'height_cm' | 'weight_kg'>): number {
  const w = Number(p.weight_kg) || 0;
  const h = Number(p.height_cm) || 0;
  const a = calcAge(p.birth_year);
  const base = 10 * w + 6.25 * h - 5 * a;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export const baselineOut = (p: Profile) => bmr(p) * NON_EXERCISE_FACTOR;

export const stepCalories = (weightKg: number, steps: number) =>
  STEP_KCAL_PER_KG_PER_STEP * (Number(weightKg) || 0) * (Number(steps) || 0);

// Net of resting burn (MET - 1) because the baseline already includes resting burn.
export const exerciseCalories = (met: number, weightKg: number, minutes: number) =>
  Math.max(0, Number(met) - 1) * (Number(weightKg) || 0) * (Number(minutes) / 60);

export type DayRow = {
  date: string;
  label: string;
  energyIn: number;
  energyOut: number;
  net: number;
  isFoodDefault: boolean;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildWeek(
  profile: Profile,
  dates: string[],
  food: { date: string; calories: number }[],
  exercise: { date: string; calories_burnt: number }[],
  steps: { date: string; calories_burnt: number; step_count?: number }[]
): DayRow[] {
  const base = baselineOut(profile);
  const fallbackSteps = profile.custom_step_default != null ? Number(profile.custom_step_default) : 5000;
  const defaultStepKcal = stepCalories(Number(profile.weight_kg), fallbackSteps);
  const defaultFoodKcal = Math.round(base + defaultStepKcal);
  const clean = (d: string) => String(d ?? '').slice(0, 10);

  return dates.map((date) => {
    const dayFood = food.filter((r) => clean(r.date) === date);
    const hasLoggedFood = dayFood.length > 0;
    const energyIn = hasLoggedFood
      ? Math.round(sum(dayFood.map((r) => Number(r.calories) || 0)))
      : defaultFoodKcal;

    const exKcal = sum(exercise.filter((r) => clean(r.date) === date).map((r) => Number(r.calories_burnt) || 0));
    const stepRow = steps.find((r) => clean(r.date) === date);

    // Use saved step calories if a row exists; otherwise fall back to profile default step calories
    const stepKcal = stepRow ? (Number(stepRow.calories_burnt) || 0) : defaultStepKcal;
    const energyOut = Math.round(base + stepKcal + exKcal);

    return {
      date,
      label: dayLabel(date),
      energyIn,
      energyOut,
      net: energyIn - energyOut,
      isFoodDefault: !hasLoggedFood,
    };
  });
}