import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return NextResponse.json({ error: 'Sign in as an administrator first.' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 });
  const { data: admin } = await supabase.from('admin_users').select('id').eq('auth_user_id', authData.user.id).eq('active', true).maybeSingle();
  if (!admin) return NextResponse.json({ error: 'Only an active administrator can export attendance.' }, { status: 403 });

  const course = (request.nextUrl.searchParams.get('course') ?? '').trim();
  if (!course) return NextResponse.json({ error: 'Choose a course to export.' }, { status: 400 });

  const { data: sessions, error: sessionError } = await supabase.from('attendance_sessions').select('id,title,starts_at,ends_at').eq('title', course);
  if (sessionError) return NextResponse.json({ error: 'Could not load course sessions.' }, { status: 500 });
  if (!sessions?.length) return NextResponse.json({ error: 'No sessions found for this course.' }, { status: 404 });

  const sessionIds = sessions.map(s => s.id);
  const sessionById = new Map(sessions.map(s => [s.id, s]));
  const rows: { student_id: string; session_id: string; checked_in_at: string; profiles: { full_name: string | null; matric_no: string | null; email: string | null } | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('attendance_records')
      .select('student_id,session_id,checked_in_at,profiles(full_name,matric_no,email)')
      .in('session_id', sessionIds).order('checked_in_at', { ascending: true }).range(offset, offset + 999);
    if (error) return NextResponse.json({ error: 'Could not load attendance records.' }, { status: 500 });
    rows.push(...((data ?? []) as unknown as typeof rows));
    if (!data || data.length < 1000) break;
  }

  const header = ['Course', 'Session', 'Session starts', 'Session ends', 'Student name', 'Matric number', 'Student email', 'Attendance status', 'Checked in at'];
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) {
    const session = sessionById.get(row.session_id);
    lines.push([
      course, session?.title, session?.starts_at, session?.ends_at,
      row.profiles?.full_name, row.profiles?.matric_no, row.profiles?.email,
      'Present', row.checked_in_at,
    ].map(csvCell).join(','));
  }
  const safeName = course.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'course';
  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}_attendance.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
