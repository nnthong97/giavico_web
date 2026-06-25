import { InjectionToken, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase.generated';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },
});

export const injectSupabase = (): SupabaseClient | null => inject(SUPABASE_CLIENT);
