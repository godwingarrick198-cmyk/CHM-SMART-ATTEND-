import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return NextResponse.json({ error: 'Sign in as an administrator first.' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 });

  const { data: actor, error: actorError } = await supabase
    .from('admin_users').select('id').eq('auth_user_id', authData.user.id).eq('active', true).maybeSingle();
  if (actorError || !actor) return NextResponse.json({ error: 'Only an active administrator can add administrators.' }, { status: 403 });

  let body: { email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 }); }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (email === 'godwingarrick198@gmail.com') return NextResponse.json({ error: 'The primary administrator is already configured.' }, { status: 409 });

  const { data: existing } = await supabase.from('admin_users').select('id').ilike('email', email).maybeSingle();
  if (existing) return NextResponse.json({ error: 'This email is already registered as an administrator.' }, { status: 409 });

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin}/admin/reset-password`,
  });
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message ?? 'Could not send the administrator invitation.' }, { status: 400 });
  }

  const { error: insertError } = await supabase.from('admin_users').insert({
    email, auth_user_id: invited.user.id, active: true, phone_e164: null,
  });
  if (insertError) {
    await supabase.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: 'The invitation could not be registered: ' + insertError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: `Administrator invitation sent to ${email}. They must use the invitation email to set a password.` });
}
