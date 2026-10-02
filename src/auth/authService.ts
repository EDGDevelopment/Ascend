import { supabase } from '@/lib/supabase'
import { createDemoAuth } from './demoAuth'
import { createSupabaseAuth } from './supabaseAuth'
import type { AuthService } from './types'

/** Supabase when configured, otherwise the local demo implementation. */
export const authService: AuthService = supabase ? createSupabaseAuth(supabase) : createDemoAuth()
