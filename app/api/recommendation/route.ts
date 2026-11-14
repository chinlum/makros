import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/guard';
import { todayISO } from '@/lib/dates';
import { baselineOut, stepCalories, calcAge } from '@/lib/energy';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error('GEMINI_API_KEY or GEMINI_MODEL is not set');
  return { ai: new GoogleGenAI({ apiKey }), model };
}

const recommendationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    generatedForDate: { type: Type.STRING },
    recommendedFoodKcal: { type: Type.NUMBER },
    recommendedExerciseKcal: { type: Type.NUMBER },
    macroTargets: { type: Type.STRING },
    dietaryAnalysis: { type: Type.STRING },
    exerciseStrategy: { type: Type.STRING }
  },
  required: ['generatedForDate', 'recommendedFoodKcal', 'recommendedExerciseKcal', 'macroTargets', 'dietaryAnalysis', 'exerciseStrategy']
};

export async function GET() {
  // Enforce login and daily AI cap
  const blocked = await guard();
  if (blocked) return blocked;

  const supabase = createClient();

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    const today = todayISO();
    const readableDateStamp = new Date().toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const [foodLogs, exerciseLogs, stepLogs] = await Promise.all([
      supabase.from('food_logs').select('date, meal_type, description, calories, protein_g, carbs_g, fats_g').lt('date', today).order('date', { ascending: false }),
      supabase.from('exercise_logs').select('date, activity_name, duration_minutes, calories_burnt').lt('date', today).order('date', { ascending: false }),
      supabase.from('step_logs').select('date, step_count, calories_burnt').lt('date', today).order('date', { ascending: false })
    ]);

    const historyData = {
      profile: {
        sex: profile.sex,
        age: calcAge(profile.birth_year),
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        calculatedBaselineOutKcal: baselineOut(profile),
        defaultStepKcal: Math.round(stepCalories(profile.weight_kg, profile.custom_step_default))
      },
      recentFoodLogs: foodLogs?.data?.slice(0, 15) ?? [],
      recentExerciseLogs: exerciseLogs?.data?.slice(0, 10) ?? [],
      recentStepLogs: stepLogs?.data?.slice(0, 5) ?? []
    };

    const systemInstruction = `You are an elite health coach optimizing a user's plan for maintenance today.
Analyze their 3-day data payload history to generate today's strategy targets.
Rules:
1. Map the field "generatedForDate" exactly to this string value provided by the system: "${readableDateStamp}".
2. Provide numeric integers for food and active workout goals.
3. Keep structural commentary punchy and clean.`;

    const { ai, model } = getAiClient();
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(historyData) }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: recommendationSchema,
        temperature: 0.3
      }
    });

    if (!response.text) throw new Error('Empty response from Gemini');
    return NextResponse.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Recommendation API error:', error);
    return NextResponse.json({ error: error.message || 'AI parsing failed.' }, { status: 502 });
  }
}