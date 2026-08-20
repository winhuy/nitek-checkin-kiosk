import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://iddzqynagemldsykkitq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZHpxeW5hZ2VtbGRzeWtraXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODI1MzcsImV4cCI6MjEwMTg1ODUzN30.Qz-YGLuhwkESz6beYMlYfUETP3EU0FIzoRmS3CxmM1Y';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const isPlaceholder = (val) =>
  !val ||
  val === 'https://your-project-id.supabase.co' ||
  val === 'your-anon-key-here';

export const isConfigured =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

// Create Supabase client with active realtime subscriptions
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
