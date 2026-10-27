import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matricNo = String(body.matricNo ?? '').trim().toUpperCase();
    const password = String(body.password ?? '');
    if (!matricNo || password.length < 8) return NextResponse.json({ error: 'Enter your matriculation number and passcode.' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: 'Login service is not configured. Please try again later.' }, { status: 503 });
    const admin = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from('profiles').select('email').eq('matric_no', matricNo).maybeSingle();
    if (profileError || !profile?.email) return NextResponse.json({ error: 'Invalid matriculation number or passcode.' }, { status: 401 });
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values: { name: string; value: string; options?: any }[]) { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} }
      }
    });
    const { data, error } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.user) return NextResponse.json({ error: 'Invalid matriculation number or passcode. If you just registered, confirm your email first.' }, { status: 401 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Could not sign in. Please try again.' }, { status: 400 }); }
}
