import { createClient } from './supabase/client';

export async function currentUserId(): Promise<string> {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

