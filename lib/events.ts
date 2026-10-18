import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
};

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Please log in again before creating an event.' };
  }

  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId.trim(),
      title: event.title.trim(),
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user.id,
    },
    { onConflict: 'event_code' }
  );

  if (error) {
    console.log('CREATE EVENT ERROR:', error.message);
    return { error: error.message };
  }

  return { error: null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('GET EVENTS ERROR:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code.trim())
    .maybeSingle();

  if (error) {
    console.log('GET EVENT BY CODE ERROR:', error.message);
    return null;
  }

  return data as CloudEvent | null;
}
