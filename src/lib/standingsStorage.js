// Standings screenshots live in the app's own Supabase Storage bucket
// (private: only the uploader and admins can read them).
import { getSupabase } from '@/lib/supabaseClient';

const BUCKET = 'standings';

export async function uploadStandings(file) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again to upload');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${user.id}/${Date.now()}.${ext || 'jpg'}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function standingsUrl(path) {
  if (!path) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signed_url ?? null;
}