import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Esto imprimirá en la consola si las variables están llegando (no imprime la llave completa por seguridad)
console.log("URL de Supabase detectada:", supabaseUrl ? "✅ OK" : "❌ VACÍA");
console.log("Llave Anon detectada:", supabaseAnonKey ? "✅ OK" : "❌ VACÍA");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR CRÍTICO: Las credenciales de Supabase no están configuradas.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-error.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)