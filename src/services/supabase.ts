// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Ganti nilai di bawah dengan URL & API Key dari dashboard Supabase kamu
const SUPABASE_URL = 'https://xxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJKV1QiLC...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
