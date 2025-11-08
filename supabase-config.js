// supabase-config.js

// 1️⃣ Supabase credentials
export const SUPABASE_URL = "https://lnotfvpxjgndtongayfg.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxub3RmdnB4amduZHRvbmdheWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzExMTYsImV4cCI6MjA3ODE0NzExNn0.NreQihzs-an46owG-LD9KtnnTyVyAGBV4ZgScLiX1Fs";

// 2️⃣ Import Supabase createClient from CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/supabase.min.js";

// 3️⃣ Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
