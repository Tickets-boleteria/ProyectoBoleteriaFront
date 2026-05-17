import { createClient } from '@supabase/supabase-js'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Prefer the standard anon key name used by Supabase + Vite
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
	// Fail early with a clear message in the browser console
	console.error('Missing Supabase config. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)