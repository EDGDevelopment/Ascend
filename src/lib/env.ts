const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const env = {
  supabaseUrl: url ?? '',
  supabaseKey: key ?? '',
  /** True when both Supabase values are present. Otherwise the app runs in demo mode. */
  hasSupabase: Boolean(url && key),
}
