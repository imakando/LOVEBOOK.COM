// supabase-config.js

// Your Supabase credentials
export const SUPABASE_URL = "https://lnotfvpxjgndtongayfg.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInJlZiI6Imxub3RmdnB4amduZHRvbmdheWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzExMTYsImV4cCI6MjA3ODE0NzExNn0.NreQihzs-an46owG-LD9KtnnTyVyAGBV4ZgScLiX1Fs";

// Import createClient from the **correct Supabase CDN**
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
