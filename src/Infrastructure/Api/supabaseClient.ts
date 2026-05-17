import { createClient } from '@supabase/supabase-js'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Faltan variables de entorno de Supabase. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_KEY en tu .env real.'
	)
}

export const supabase = createClient(supabaseUrl, supabaseKey)