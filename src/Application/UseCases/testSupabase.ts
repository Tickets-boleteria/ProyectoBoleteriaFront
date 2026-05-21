import { supabase } from '../../Infrastructure/Api/supabaseClient'

export async function testSupabase() {
  const { data, error } = await supabase
    .from('cooperativa')
    .select('*')

  return { data, error }
}