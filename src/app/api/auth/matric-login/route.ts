import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matricNo = String(body.matricNo ?? '').trim().toUpperCase();
    if (!matricNo) return NextResponse.json({ error: 'Enter your matriculation number.' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Login service is not configured. Please try again later.' }, { status: 503 });
    }

    const admin = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin
      .from('profiles').select('email').eq('matric_no', matricNo).maybeSingle();

    if (profileError || !profile?.email) {
      return NextResponse.json({ error: 'We could not find an account for that matric number. Check the number or contact your class administrator.' }, { status: 404 });
    }

    const auth = createSupabaseClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await auth.auth.signInWithOtp({
      email: profile.email,
      options: { emailRedirectTo: 'https://chm-smart-attend.vercel.app/auth/callback', shouldCreateUser: false }
    });

    if (error) {
      return NextResponse.json({ error: 'Could not send the sign-in link. Please try again shortly.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not request a sign-in link. Please try again.' }, { status: 400 });
  }
}
