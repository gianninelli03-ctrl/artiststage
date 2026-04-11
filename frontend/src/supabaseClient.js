import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // sessione salvata in localStorage
    autoRefreshToken: true,     // rinnova automaticamente l'access token prima della scadenza
    detectSessionInUrl: true,   // necessario per OAuth/magic link
    storage: window.localStorage,
  }
});