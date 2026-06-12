import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

const REMEMBER_KEY = 'supabase-remember-me'

export function setRememberMe(remember: boolean): void {
  if (remember) localStorage.setItem(REMEMBER_KEY, 'true')
  else localStorage.removeItem(REMEMBER_KEY)
}

function rememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true'
}

const sessionAwareStorage = {
  getItem: (key: string) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (rememberMe()) localStorage.setItem(key, value)
    else sessionStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionAwareStorage,
  },
})
