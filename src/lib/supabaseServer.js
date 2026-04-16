import { createServerClient } from '@supabase/ssr'
import { createClient as createJSClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Función principal
export async function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }) } catch (e) {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }) } catch (e) {} },
      },
    }
  )
}

// ALIAS PARA COMPATIBILIDAD CON TODAS LAS APIS
export const createClientSSR = createClient;

// FUNCIÓN PARA PANEL MASTER (Service Role)
export function createAdminClient() {
  return createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
