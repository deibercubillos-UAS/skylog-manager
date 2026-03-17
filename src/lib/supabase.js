import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Esto nos ayudará a ver el error en la consola del navegador (F12)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: No se encontraron las credenciales de Supabase. Verifica tu archivo .env o las variables en Vercel.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', // Evita que la app truene totalmente
  supabaseAnonKey || 'placeholder'
)