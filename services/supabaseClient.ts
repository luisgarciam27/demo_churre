
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjuslxvnkwvijlewaoni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdXNseHZua3d2aWpsZXdhb25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MzMzNzksImV4cCI6MjA4MzQwOTM3OX0.byNYK52j32J9sPOLUqm8uPU5PBX--HwO91qhJICyFyc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
