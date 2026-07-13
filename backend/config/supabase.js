const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('dummy') || supabaseKey.includes('dummy')) {
  console.warn('WARNING: Supabase URL or Key is not configured. File uploads will be mocked for local testing.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
  }
}

module.exports = supabase;
