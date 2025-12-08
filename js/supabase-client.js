import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/+esm';

const SUPABASE_URL = 'https://umuiapirxdbcirvylrlw.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtdWlhcGlyeGRiY2lydnlscmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNTYyMjgsImV4cCI6MjA2NjgzMjIyOH0.6TYu5Adm-rjrptcC_2IpJUT7UgDeK48m6E-Omz8PDfE'; 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
