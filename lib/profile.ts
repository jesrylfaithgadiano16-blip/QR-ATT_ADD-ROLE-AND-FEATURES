import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.log('PROFILE ERROR:', error.message);
    return null;
  }

  if (!data) {
    console.log('PROFILE NOT FOUND for user:', userId);
    return null;
  }

  console.log('PROFILE DATA:', data);

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    role?: Role;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.log('UPDATE PROFILE ERROR:', error.message);
    return { error: error.message };
  }

  return { error: null };
}