import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvmzzlnrofqmwodubkti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bXp6bG5yb2ZxbXdvZHVia3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTE1NTQsImV4cCI6MjA3ODg2NzU1NH0.H9_2DReQgLwIUNNA7md53Eu76kUzpLDRfKJ0yMA6oFQ';

// Menginisialisasi klien Supabase nyata untuk digunakan di seluruh aplikasi.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
