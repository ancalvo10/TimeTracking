import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfmjnevynihoztkkpyvg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbWpuZXZ5bmlob3p0a2tweXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzMxNzIsImV4cCI6MjA3MDE0OTE3Mn0.NVKPbpWVc9uWTufboSCfeaByxjbpCPn4nHUq2WgDXVk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);