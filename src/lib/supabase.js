import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Logs de depuración
if (typeof window !== "undefined") {
  console.log("Supabase URL cargada:", supabaseUrl ? "✅ OK" : "❌ VACÍA");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)