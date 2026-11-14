import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/dates';
import { calcAge } from '@/lib/energy';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const cleanDate = (d: unknown) => String(d ?? '').slice(0, 10);

export async function GET(req: Request) {
  void req.url;

  const supabase = createClient();

  // Verify the user is signed in before exporting data
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const [profileRes, foodRes, exerciseRes, stepRes] = await Promise.all([
      supabase.from('profiles').select('*').maybeSingle(),
      supabase.from('food_logs').select('date, meal_type, description, calories, protein_g, carbs_g, fats_g').order('date', { ascending: false }),
      supabase.from('exercise_logs').select('date, activity_name, duration_minutes, calories_burnt').order('date', { ascending: false }),
      supabase.from('step_logs').select('date, step_count, calories_burnt').order('date', { ascending: false }),
    ]);

    const dbError = profileRes.error || foodRes.error || exerciseRes.error || stepRes.error;
    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    if (!profileRes.data) {
      return NextResponse.json({ error: 'Save a profile before exporting.' }, { status: 400 });
    }

    const p = profileRes.data;
    const foodData = foodRes.data || [];
    const exerciseData = exerciseRes.data || [];
    const stepData = stepRes.data || [];

    const wb = XLSX.utils.book_new();

    // --- TAB 1: PROFILE ---
    const profileRows = [
      { Metric: 'Sex', Value: p.sex === 'male' ? 'Male' : 'Female' },
      { Metric: 'Birth Year', Value: p.birth_year },
      { Metric: 'Age', Value: `${calcAge(p.birth_year)} years` },
      { Metric: 'Height', Value: `${p.height_cm} cm` },
      { Metric: 'Weight', Value: `${p.weight_kg} kg` },
      { Metric: 'Default Daily Steps', Value: p.custom_step_default },
      { Metric: 'Activity Level Setting', Value: p.activity_level || 'None' }
    ];
    const wsProfile = XLSX.utils.json_to_sheet(profileRows);
    XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

    // --- TAB 2: FOOD LOGS ---
    const foodRows = foodData.map(f => ({
      Date: cleanDate(f.date),
      'Meal Type': f.meal_type,
      Description: f.description || '-',
      Calories: Math.round(Number(f.calories)),
      'Protein (g)': Number(f.protein_g),
      'Carbs (g)': Number(f.carbs_g),
      'Fats (g)': Number(f.fats_g)
    }));
    const wsFood = XLSX.utils.json_to_sheet(foodRows);
    XLSX.utils.book_append_sheet(wb, wsFood, 'Food Logs');

    // --- TAB 3: EXERCISE & STEPS LOGS ---
    const workoutRows = exerciseData.map(e => ({
      Date: cleanDate(e.date),
      Type: 'Workout',
      'Activity / Steps': e.activity_name,
      'Duration (mins)': Math.round(Number(e.duration_minutes)),
      'Calories Burnt': Math.round(Number(e.calories_burnt))
    }));

    const stepRows = stepData.map(s => ({
      Date: cleanDate(s.date),
      Type: 'Steps',
      'Activity / Steps': `${Number(s.step_count).toLocaleString('en-SG')} steps`,
      'Duration (mins)': '-',
      'Calories Burnt': Math.round(Number(s.calories_burnt))
    }));

    const combinedExerciseRows = [...workoutRows, ...stepRows].sort((a, b) =>
      b.Date.localeCompare(a.Date)
    );

    const wsExercise = XLSX.utils.json_to_sheet(combinedExerciseRows, {
      header: ['Date', 'Type', 'Activity / Steps', 'Duration (mins)', 'Calories Burnt']
    });
    XLSX.utils.book_append_sheet(wb, wsExercise, 'Exercise Logs');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=macro-tracker-export-${todayISO()}.xlsx`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Excel compile breakdown:', err);
    return NextResponse.json({ error: err.message || 'Export routine failed.' }, { status: 502 });
  }
}