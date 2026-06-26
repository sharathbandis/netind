import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwopjfhrdgorquraynjt.supabase.co'; // <-- PASTE YOURS HERE
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b3BqZmhyZGdvcnF1cmF5bmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODI1NTQsImV4cCI6MjA4Nzc1ODU1NH0.u9HCmbG9zJi8GeMUlDKkyevUylDxy4mkG2JQzkKYbe4'; // <-- PASTE YOURS HERE

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents errors in native mobile environments
  },
});