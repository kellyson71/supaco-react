
import { createClient } from '@supabase/supabase-js';

// Project credentials provided by user
const SUPABASE_URL = 'https://nmckpmpmghmgvlhsyvzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tY2twbXBtZ2htZ3ZsaHN5dnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTEyODEsImV4cCI6MjA3OTU2NzI4MX0.7Xy96gJLaHCb9-NLJOKrLJd0wzZljvfHk4PzXHhmFLQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});
