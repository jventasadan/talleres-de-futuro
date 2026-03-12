import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vlxcsgtcafsiikherrdy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseGNzZ3RjYWZzaWlraGVycmR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg4MDQsImV4cCI6MjA4NzMzNDgwNH0.NHIO_qio_0Fkt0Py0k8N2Dwk3v62LOuZEUgQkWh-8V4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
