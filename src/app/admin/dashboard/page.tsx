'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AdminRecord = { email: string | null; phone_e164: string };

export default function AdminDashboardPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Checking administrator access…');

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) { window.location.href = '/admin'; return; }
      const { data, error } = await supabase.from('admin_users').select('email, phone_e164').eq('auth_user_id', userData.user.id).eq('active', true).maybeSingle();
      if (!active) return;
      if (error || !data) { await supabase.auth.signOut(); window.location.href = '/admin'; return; }
      const record = data as AdminRecord;
      setEmail(record.email ?? userData.user.email ?? '');
      setPhone(record.phone_e164);
      setStatus('Administrator email verified. Your admin session is active.');
    }
    void checkAccess();
    return () => { active = false; };
  }, []);

  async function signOut() { await createClient().auth.signOut(); window.location.href = '/admin'; }

  return (
    <main className="shell">
      <div className="ambient ambientOne" /><div className="ambient ambientTwo" />
      <header className="topbar">
        <a className="brand" href="/"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>ADMIN DASHBOARD</small></span></a>
        <button type="button" className="tab" onClick={signOut}>Sign out</button>
      </header>
      <section className="heroGrid">
        <div className="intro">
          <div className="eyebrow"><span /> ADMINISTRATOR ACCESS</div>
          <h1>Welcome<br /><em>back.</em></h1>
          <p className="lead">{status}</p>
          {email && <p className="lead">Verified admin email: {email}</p>}
          {phone && <p className="lead">Authorized admin number on record: {phone}</p>}
        </div>
        <section className="authCard">
          <p className="overline">SETUP STATUS</p>
          <h2>Admin sign-in is connected</h2>
          <p className="lead">Email OTP sign-in and administrator access checks are in place. Attendance management tools are not available on this screen yet; they must be added before this dashboard can manage sessions or student records.</p>
          <a className="submitButton" href="/" style={{ display: 'inline-flex', textDecoration: 'none', alignItems: 'center', justifyContent: 'center' }}>Return to portal ↗</a>
        </section>
      </section>
    </main>
  );
}
