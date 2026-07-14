import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingConfigError = new Error('Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY en .env');

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(missingConfigError.message);
}

export function isSupabaseConfigError(error) {
  return error?.message === missingConfigError.message;
}

function createMissingConfigClient() {
  const failedResult = Promise.resolve({ data: null, error: missingConfigError });
  const query = {
    select: () => query,
    insert: () => query,
    upsert: () => query,
    update: () => query,
    delete: () => query,
    eq: () => query,
    gte: () => query,
    in: () => query,
    lt: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: () => failedResult,
    single: () => failedResult,
    then: (resolve, reject) => failedResult.then(resolve, reject)
  };

  return {
    from: () => query,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: missingConfigError }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => failedResult,
      signOut: () => failedResult
    },
    functions: {
      invoke: () => failedResult
    }
  };
}

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true
      }
    })
  : createMissingConfigClient();

