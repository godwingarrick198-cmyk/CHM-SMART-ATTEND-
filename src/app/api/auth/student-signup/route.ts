import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const matricNo = String(body.matricNo ?? '').trim().toUpperCase();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!fullName || !matricNo || !email || password.length < 8) {
      return NextResponse.json({ error: 'Enter your name, matric number, Gmail, and a password of at least 8 characters.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Registration service is not configured. Please contact the administrator.' }, { status: 503 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: existing, error: lookupError } = await admin.from('profiles').select('id').or('matric_no.eq.' + matricNo.replace(/[,().]/g, '') + ',email.eq.' + email).limit(1);
    if (lookupError) return NextResponse.json({ error: 'Could not validate student details. Please try again.' }, { status: 500 });
    if (existing?.length) return NextResponse.json({ error: 'That matric number or email is already registered. Please log in instead.' }, { status: 409 });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, matric_no: matricNo }
    });
    if (error || !data.user) {
      const msg = error?.message?.toLowerCase() ?? '';
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return NextResponse.json({ error: 'That email is already registered. Try logging in or contact the administrator.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Could not create the student account. Check the details and try again.' }, { status: 400 });
    }

    // The database trigger creates the matching student profile from auth user metadata.
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not create the student account. Please try again.' }, { status: 400 });
  }
}
