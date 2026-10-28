'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
type Profile = { full_name: string; matric_no: string; email: string };
type Session = { id: string; title: string; starts_at: string; ends_at: string; is_open: boolean };
type RecordRow = { id: string; checked_in_at: string; session_id: string; attendance_sessions?: { title: string } | null };
export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.replace('/'); return; }
    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('full_name, matric_no, email').eq('id', auth.user.id).maybeSingle(),
      supabase.from('attendance_sessions').select('id, title, starts_at, ends_at, is_open').eq('is_open', true).order('starts_at'),
      supabase.from('attendance_records').select('id, checked_in_at, session_id, attendance_sessions(title)').eq('student_id', auth.user.id).order('checked_in_at', { ascending: false }).limit(100)
    ]);
    setProfile(p as Profile | null); setSessions((s ?? []) as Session[]); setRecords((r ?? []) as unknown as RecordRow[]); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function checkIn(sessionId: string) {
    setNotice(''); setBusyId(sessionId);
    if (!navigator.geolocation) { setNotice('Your browser does not support GPS location.'); setBusyId(''); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { error } = await supabase.rpc('student_check_in', { p_session_id: sessionId, p_latitude: pos.coords.latitude, p_longitude: pos.coords.longitude });
        if (error) throw error;
        setNotice('Attendance recorded successfully.'); await load();
      } catch (e) { setNotice(e instanceof Error ? e.message : 'Check-in failed.'); }
      finally { setBusyId(''); }
    }, (error) => {
      let message = 'Could not get your location. Turn on Location on your phone and try again.';
      if (error.code === error.PERMISSION_DENIED) {
        message = 'Location access was blocked. On your phone, open Chrome Settings → Site settings → Location, allow chm-smart-attend.vercel.app, then return here and tap Check in with GPS again. Also make sure phone Location is turned on.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = 'Your phone could not determine your location. Turn on phone Location/GPS, move somewhere with a clearer signal, and try again.';
      } else if (error.code === error.TIMEOUT) {
        message = 'Location lookup timed out. Turn on phone Location/GPS and try again.';
      }
      setNotice(message);
      setBusyId('');
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
  async function signOut() { await supabase.auth.signOut(); window.location.replace('/'); }
  if (loading) return <main className="dashboardShell"><div className="dashLoading">Loading your student portal…</div></main>;
  return <main className="dashboardShell">
    <header className="dashHeader"><a className="brand" href="/"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>STUDENT DASHBOARD</small></span></a><button className="dashGhost" onClick={signOut}>Sign out ↗</button></header>
    <section className="dashContent"><div className="dashEyebrow">STUDENT PORTAL / OVERVIEW</div><h1 className="dashTitle">Good to see you{profile?.full_name ? ',' : ''}<br/><em>{profile?.full_name?.split(' ')[0] ?? 'student'}.</em></h1><p className="dashLead">Your CHM attendance, all in one place.</p>
      {!profile && <div className="dashNotice">Your student profile has not been created yet. Please contact the administrator before checking in.</div>}
      {notice && <div className="dashNotice" role="status">{notice}</div>}
      <div className="statsGrid"><article className="statCard"><span>MATRIC NUMBER</span><strong>{profile?.matric_no ?? 'Not available'}</strong><small>Registered student ID</small></article><article className="statCard"><span>CLASSES ATTENDED</span><strong>{records.length}</strong><small>Recorded check-ins</small></article><article className="statCard"><span>ATTENDANCE HISTORY</span><strong>{records.length ? 'Active' : '—'}</strong><small>Successful check-ins</small></article></div>
      <section className="dashSection"><div className="sectionHeading"><div><span>01 / LIVE SESSIONS</span><h2>Available check-ins</h2></div><button className="dashGhost" onClick={() => void load()}>Refresh ↻</button></div>
        {sessions.length === 0 ? <div className="emptyState"><span>◎</span><strong>No open attendance sessions</strong><p>When your lecturer or administrator opens a session, it will appear here.</p></div> : <div className="sessionGrid">{sessions.map(s => <article className="sessionCard" key={s.id}><div className="liveTag"><i/> SESSION OPEN</div><h3>{s.title}</h3><p>{new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString()}</p><button className="dashPrimary" disabled={!!busyId || !profile} onClick={() => void checkIn(s.id)}>{busyId === s.id ? 'Checking location…' : 'Check in with GPS ↗'}</button></article>)}</div>}
      </section>
      <section className="dashSection"><div className="sectionHeading"><div><span>02 / YOUR RECORDS</span><h2>Recent attendance</h2></div></div>
        {records.length === 0 ? <div className="emptyState"><span>◌</span><strong>No attendance records yet</strong><p>Your successful check-ins will appear here.</p></div> : <div className="recordList">{records.map(row => <div className="recordRow" key={row.id}><span className="recordCheck">✓</span><div><strong>{row.attendance_sessions?.title ?? 'CHM class session'}</strong><small>{new Date(row.checked_in_at).toLocaleString()}</small></div><span className="recordStatus">RECORDED</span></div>)}</div>}
      </section><div className="privacyNote">GPS check-ins are validated against the department's configured class location and radius. Keep location services enabled during attendance.</div>
    </section><footer className="dashFooter">CHM SMART ATTEND <span>© {new Date().getFullYear()}</span></footer>
  </main>;
}
