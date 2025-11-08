// supabase-config.js

export const SUPABASE_URL = "https://lnotfvpxjgndtongayfg.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub3RmdnB4amduZHRvbmdheWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzExMTYsImV4cCI6MjA3ODE0NzExNn0.NreQihzs-an46owG-LD9KtnnTyVyAGBV4ZgScLiX1Fs";

// Correct CDN URL for Supabase JS v2
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.35.0/dist/supabase.min.js";

// Initialize client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
