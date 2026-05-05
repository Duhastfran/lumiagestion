/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

const isConfigured =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key';

if (!isConfigured) {
  console.warn('Supabase credentials missing. Running in preview mode — data features disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseReady = isConfigured;
