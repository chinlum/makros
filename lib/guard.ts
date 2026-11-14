import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Returns null if the caller may proceed, otherwise the error response to send.
export async function guard(): Promise<NextResponse | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const limit = Number(process.env.AI_DAILY_LIMIT ?? 15);
  const { data: allowed, error } = await supabase.rpc('consume_ai_call', { p_limit: limit });
  if (error) return NextResponse.json({ error: 'Could not check your daily limit.' }, { status: 500 });
  if (!allowed) {
    return NextResponse.json({ error: `Daily AI limit of ${limit} reached. It resets at 00:00 UTC.` }, { status: 429 });
  }
  return null;
}
