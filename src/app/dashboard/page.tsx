'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
type Profile = { full_name: string; matric_no: string; email: string; level:number; approval_status:string };
type Session = { id: string; title: string; course_code: string; course_id:string; level:number; starts_at: string; ends_at: string; is_open: boolean };
type RecordRow = { id: string; checked_in_at: string; session_id: string; attendance_sessions?: { title: string; course_code: string } | null };
export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courseSessions, setCourseSessions] = useState<Session[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [courseConfig,setCourseConfig]=useState<any[]>([]);
  const supabase = createClient();
  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.replace('/'); return; }
    const [{ data: p }, { data: s }, { data: allSessions }, { data: r }, { data: settings }] = await Promise.all([
      supabase.from('profiles').select('full_name, matric_no, email,level,approval_status').eq('id', auth.user.id).maybeSingle(),
      supabase.from('attendance_sessions').select('id,title,course_code,course_id,level,starts_at,ends_at,is_open').eq('is_open', true).order('starts_at'),
      supabase.from('attendance_sessions').select('id,title,course_code,course_id,level,starts_at,ends_at,is_open').order('ends_at'),
      supabase.from('attendance_records').select('id, checked_in_at, session_id, attendance_sessions(title, course_code)').eq('student_id', auth.user.id).order('checked_in_at', { ascending: false }).limit(1000),
      supabase.from('courses').select('id,course_code,course_title,expected_classes,level').eq('active',true)
    ]);
    setProfile(p as Profile | null); setSessions((s ?? []) as Session[]); setCourseSessions((allSessions ?? []) as Session[]); setRecords((r ?? []) as unknown as RecordRow[]); setCourseConfig((settings??[]) as any[]); setLoading(false);
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => setNowMs(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  function distanceMetres(lat1:number,lon1:number,lat2:number,lon2:number){const rad=(v:number)=>v*Math.PI/180;const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
  async function checkIn(sessionId: string) {
    setBusyId(sessionId);
    setNotice('Finding your most accurate GPS location… Keep your phone still for a few seconds.');
    if (!navigator.geolocation) {
      setNotice('Your browser does not support GPS location.');
      setBusyId('');
      return;
    }

    type LocationFix = { latitude: number; longitude: number; accuracy: number; timestamp: number };
    const getBestLocation = () => new Promise<LocationFix>((resolve, reject) => {
      const fixes: LocationFix[] = [];
      let watchId: number | null = null;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(timer);
        if (fixes.length === 0) {
          reject(new Error('Your phone could not determine your location. Turn on Location/GPS, move somewhere with a clearer signal, and try again.'));
          return;
        }
        fixes.sort((a, b) => a.accuracy - b.accuracy);
        resolve(fixes[0]);
      };
      const timer = window.setTimeout(finish, 10000);
      try {
        watchId = navigator.geolocation.watchPosition(
          position => {
            const fix: LocationFix = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            if (Number.isFinite(fix.latitude) && Number.isFinite(fix.longitude) &&
                Number.isFinite(fix.accuracy) && fix.accuracy > 0 &&
                Date.now() - fix.timestamp < 15000) {
              fixes.push(fix);
            }
            // Collect several fresh readings, then use the one with the smallest
            // reported uncertainty. The database remains the authority on the geofence.
            if (fixes.length >= 4) finish();
          },
          error => {
            if (fixes.length > 0) finish();
            else if (error.code === error.PERMISSION_DENIED) {
              if (!settled) {
                settled = true;
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                window.clearTimeout(timer);
                reject(new Error('Location access was blocked. Allow location for chm-smart-attend.vercel.app in Chrome site settings, and make sure phone Location is turned on.'));
              }
            } else if (error.code === error.TIMEOUT && fixes.length === 0) {
              if (!settled) {
                settled = true;
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                window.clearTimeout(timer);
                reject(new Error('Location lookup timed out. Turn on phone Location/GPS and try again.'));
              }
            }
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      } catch {
        window.clearTimeout(timer);
        reject(new Error('Could not start GPS location. Check your browser permissions and try again.'));
      }
    });

    try {
      const bestFix = await getBestLocation();
      setNotice(`GPS fix found (about ±${Math.round(bestFix.accuracy)} m). Verifying your classroom location…`);
      const { error } = await supabase.rpc('student_check_in', {
        p_session_id: sessionId,
        p_latitude: bestFix.latitude,
        p_longitude: bestFix.longitude
      });
      if (error) throw error;
      setNotice(`Attendance recorded successfully. Used your best GPS reading (about ±${Math.round(bestFix.accuracy)} metres).`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Check-in failed.');
    } finally {
      setBusyId('');
    }
  }
  const normalizeCourseCode = (value?: string | null) => (value || 'Unassigned').trim().replace(/\\s+/g, ' ').toUpperCase();
  const courseTotals = courseSessions
    .filter(s => new Date(s.ends_at).getTime() <= Date.now())
    .reduce((groups, s) => {
      const code = normalizeCourseCode(s.course_code);
      groups[code] = (groups[code] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  const courseAttendance = records.reduce((groups, row) => {
    const code = normalizeCourseCode(row.attendance_sessions?.course_code);
    groups[code] = (groups[code] || 0) + 1;
    return groups;
  }, {} as Record<string, number>);
  const totalClasses=courseConfig.filter(c=>c.level===profile?.level).reduce((n,c)=>n+Number(c.expected_classes),0); const attendancePercent = totalClasses?Math.min(100,Math.round((records.length/totalClasses)*100)):0;
  async function signOut() { await supabase.auth.signOut(); window.location.replace('/'); }
  if (loading) return <main className="dashboardShell"><div className="dashLoading">Loading your student portal…</div></main>;
  return <main className="dashboardShell">
    <header className="dashHeader"><a className="brand" href="/"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>STUDENT DASHBOARD</small></span></a><button className="dashGhost" onClick={signOut}>Sign out ↗</button></header>
    <section className="dashContent"><div className="dashEyebrow">STUDENT PORTAL / OVERVIEW</div><h1 className="dashTitle">Good to see you{profile?.full_name ? ',' : ''}<br/><em>{profile?.full_name?.split(' ')[0] ?? 'student'}.</em></h1><p className="dashLead">Your CHM attendance, all in one place.</p>
      {!profile && <div className="dashNotice">Your student profile has not been created yet. Please contact the administrator.</div>}{profile&&<div className="dashNotice">{profile.level} Level · {profile.approval_status==='approved'?'Approved registration':'Registration pending approval'}</div>}
      {notice && <div className="dashNotice" role="status">{notice}</div>}
      <div className="statsGrid"><article className="statCard"><span>MATRIC NUMBER</span><strong>{profile?.matric_no ?? 'Not available'}</strong><small>{profile?.level} Level · Registered student ID</small></article><article className="statCard"><span>CLASSES ATTENDED</span><strong>{records.length}</strong><small>Recorded check-ins</small></article><article className="statCard"><span>ATTENDANCE PROGRESS</span><strong>{attendancePercent}%</strong><small>{records.length} of {totalClasses} classes attended</small><div role="progressbar" aria-label="Attendance progress" aria-valuenow={attendancePercent} aria-valuemin={0} aria-valuemax={100} style={{height:8,marginTop:12,borderRadius:99,background:'rgba(255,255,255,0.12)',overflow:'hidden'}}><div style={{height:'100%',width:`${attendancePercent}%`,borderRadius:99,background:'var(--accent, #62e6b5)',transition:'width 250ms ease'}} /></div></article></div>
      <section className="dashSection"><div className="sectionHeading"><div><span>COURSE BREAKDOWN</span><h2>Attendance by course code</h2></div></div>{Object.keys(courseTotals).length===0 ? <div className="emptyState">Course percentages will appear after attendance sessions have ended.</div> : <div className="statsGrid">{Object.entries(courseTotals).sort(([a],[b])=>a.localeCompare(b)).map(([code,total])=>{const attended=courseAttendance[code]??0;const percent=Math.min(100,Math.round(attended/Math.max(1,total)*100));return <article className="statCard" key={code}><span>{code}</span><strong>{percent}%</strong><small>{attended} of {total} classes attended</small><div role="progressbar" aria-label={`${code} attendance`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} style={{height:8,marginTop:12,borderRadius:99,background:'rgba(255,255,255,0.12)',overflow:'hidden'}}><div style={{height:'100%',width:`${percent}%`,borderRadius:99,background:'var(--accent, #62e6b5)',transition:'width 250ms ease'}} /></div></article>})}</div>}</section>
      <section className="dashSection"><div className="sectionHeading"><div><span>01 / LIVE SESSIONS</span><h2>Available check-ins</h2></div><button className="dashGhost" onClick={() => void load()}>Refresh ↻</button></div>
        {sessions.length === 0 ? <div className="emptyState"><span>◎</span><strong>No open attendance sessions</strong><p>When your level administrator opens a session, it will appear here.</p></div> : <div className="sessionGrid">{sessions.filter(s=>s.level===profile?.level).map(s => { const alreadyCheckedIn = records.some(row => row.session_id === s.id); const notStarted = nowMs < new Date(s.starts_at).getTime(); return <article className="sessionCard" key={s.id}><div className="liveTag"><i/> SESSION OPEN</div><h3>{s.course_code} · {s.title}</h3><p>{new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString()}</p><button className="dashPrimary" disabled={!!busyId || !profile || alreadyCheckedIn || notStarted} onClick={() => void checkIn(s.id)}>{alreadyCheckedIn ? 'Already checked in ✓' : busyId === s.id ? 'Checking location…' : notStarted ? `Opens at ${new Date(s.starts_at).toLocaleString()}` : 'Check in with GPS ↗'}</button></article>; })}</div>}
      </section>
      <section className="dashSection"><div className="sectionHeading"><div><span>02 / YOUR RECORDS</span><h2>Recent attendance</h2></div></div>
        {records.length === 0 ? <div className="emptyState"><span>◌</span><strong>No attendance records yet</strong><p>Your successful check-ins will appear here.</p></div> : <div className="recordList">{records.map(row => <div className="recordRow" key={row.id}><span className="recordCheck">✓</span><div><strong>{row.attendance_sessions?.course_code ?? 'COURSE'} · {row.attendance_sessions?.title ?? 'CHM class session'}</strong><small>{new Date(row.checked_in_at).toLocaleString()}</small></div><span className="recordStatus">RECORDED</span></div>)}</div>}
      </section><div className="privacyNote">GPS check-ins are validated against the department's configured class location and radius. Keep location services enabled during attendance.</div>
    </section><footer className="dashFooter">CHM SMART ATTEND <span>© {new Date().getFullYear()}</span></footer>
  </main>;
}
