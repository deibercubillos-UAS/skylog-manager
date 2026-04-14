import { createServerClient } from '@supabase/ssr'
import { createClient as createJSClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Cliente estándar para APIs y Dashboard (Next.js 14)
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}

// Cliente Maestro para el Panel Master (Bypassa RLS)
export function createAdminClient() {
  return createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
