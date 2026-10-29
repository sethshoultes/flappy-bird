import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Null when the build has no leaderboard settings (.env.example): the game then plays without a leaderboard instead of failing to load. */
export const supabase = supabaseUrl && supabaseKey ? createClient<Database>(supabaseUrl, supabaseKey) : null;
