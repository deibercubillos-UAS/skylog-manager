import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log de depuracion para el navegador
if (typeof window !== "undefined") {
  console.log("Supabase URL cargada:", supabaseUrl ? "✅ OK" : "❌ VACÍA");
  console.log("Supabase Key cargada:", supabaseAnonKey ? "✅ OK" : "❌ VACÍA");
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Credenciales de Supabase no detectadas. Verifica las Environment Variables en Vercel.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-error.supabase.co',
  supabaseAnonKey || 'placeholder'
)
