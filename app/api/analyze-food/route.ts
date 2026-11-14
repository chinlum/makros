import { NextResponse } from 'next/server';
import { analyzeFood } from '@/lib/gemini';
import { guard } from '@/lib/guard';

export const maxDuration = 60;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export async function POST(req: Request) {
  let body: { images?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid request.');
  }

  const images = (Array.isArray(body.images) ? body.images : []) as { mimeType?: string; data?: string }[];
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';

  if (images.length === 0 && !text) return bad('Add a photo or a description.');
  if (images.length > 6) return bad('Maximum 6 photos per entry.');

  for (const img of images) {
    if (!img.mimeType || !ALLOWED_TYPES.includes(img.mimeType) || typeof img.data !== 'string' || img.data.length > 900_000) {
      return bad('Invalid or oversized image.');
    }
  }

  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const result = await analyzeFood(
      images.map((i) => ({ mimeType: i.mimeType as string, data: i.data as string })),
      text
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('analyze-food failed:', e);
    return bad('The AI call failed. Read the terminal running npm run dev for the reason (model name? quota?).', 502);
  }
}