import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qncblxlcomsgrwqxpmah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuY2JseGxjb21zZ3J3cXhwbWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzcyNTYsImV4cCI6MjA3MzQxMzI1Nn0.7lPBX6vFyZAUDywNbz08rFMMVqxieRy6V_NrblJUDzI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
