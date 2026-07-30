import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ghtmmiofxxgnwjwmcbxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodG1taW9meHhnbndqd21jYnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTgzNzEsImV4cCI6MjEwMDk3NDM3MX0.rhrDTmP_EqiX2Gp4oyWNuzrf7V4-wm5kgWsKvvsSXPo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);