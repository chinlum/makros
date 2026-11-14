import { NextResponse } from 'next/server';
import { analyzeExercise } from '@/lib/gemini';
import { guard } from '@/lib/guard';

export const maxDuration = 60; // seconds; Vercel Hobby allows up to 300
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function POST(req: Request) {
  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid request.');
  }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';
  if (!text) return bad('Describe your workout.');

  const blocked = await guard();
  if (blocked) return blocked;

  try {
    return NextResponse.json({ activities: await analyzeExercise(text) });
  } catch (e) {
    console.error('analyze-exercise failed:', e);
    return bad('The AI call failed. Read the terminal running npm run dev for the reason (model name? quota?).', 502);
  }
}