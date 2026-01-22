
// services/supabaseClient.ts

// ⚠️ MAGIC TRICK: Importing from a URL avoids needing 'npm install'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. Go to your Supabase Dashboard -> Settings -> API
// 2. Copy "Project URL" and paste it below
const SUPABASE_URL = "https://xsidcywceipiyybqeouc.supabase.co.supabase.co";

// 3. Copy "anon / public" Key and paste it below
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaWRjeXdjZWlwaXl5YnFlb3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTY4NzYsImV4cCI6MjA4NDY3Mjg3Nn0.YNrt-8UtWBrPyf74qODywmj1XbkxzjqfNQ0EMyQ_eQo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);