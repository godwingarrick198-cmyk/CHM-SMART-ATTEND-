import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matricNo = String(body.matricNo ?? '').trim().toUpperCase();
    const password = String(body.password ?? '');
    if (!matricNo || !password) return NextResponse.json({ error: 'Enter your matric number and password.' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: 'Login service is not configured.' }, { status: 503 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from('profiles').select('email').eq('matric_no', matricNo).maybeSingle();
    if (profileError || !profile?.email) return NextResponse.json({ error: 'Invalid matric number or password.' }, { status: 401 });

    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session) return NextResponse.json({ error: 'Invalid matric number or password.' }, { status: 401 });

    return NextResponse.json({ session: data.session });
  } catch {
    return NextResponse.json({ error: 'Could not log in. Please try again.' }, { status: 400 });
  }
}
