import { supabase } from '../../Infrastructure/api/supabaseClient'

export async function testSupabase() {
  const { data, error } = await supabase
    .from('cooperativa')
    .select('*')

  return { data, error }
}