'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ADMIN_EMAIL = 'godwingarrick198@gmail.com';

export default function AdminLoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const normalized = email.trim().toLowerCase();
      if (normalized !== ADMIN_EMAIL) throw new Error('This initial admin login is restricted to the authorized administrator email.');
      const { error } = await createClient().auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });
      if (error) throw error;
      setEmail(normalized); setCodeSent(true);
      setNotice('Verification email requested. Check your inbox and spam folder. Supabase email templates must be configured to show the one-time code.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not request a verification code.'); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      if (error) throw error;
      if (!data.user) throw new Error('Verification did not return a user.');
      const { data: admin, error: adminError } = await supabase.from('admin_users').select('id, email, active').eq('auth_user_id', data.user.id).eq('active', true).maybeSingle();
      if (adminError) throw adminError;
      if (!admin) { await supabase.auth.signOut(); throw new Error('This verified email is not linked to an active administrator.'); }
      window.location.href = '/admin/dashboard';
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Code verification failed.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <div className="ambient ambientOne" /><div className="ambient ambientTwo" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="CHM Smart Attend home"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>ADMINISTRATION</small></span></a>
        <a className="secureBadge" href="/">← Student portal</a>
      </header>
      <section className="heroGrid">
        <div className="intro">
          <div className="eyebrow"><span /> AUTHORIZED STAFF ONLY</div>
          <h1>Manage<br /><em>attendance.</em></h1>
          <p className="lead">Verify the authorized administrator email with a one-time code. Only approved admin accounts can enter the dashboard.</p>
          <div className="featureList">
            <div className="feature"><span className="featureIcon">✓</span><div><strong>Email verification</strong><p>A one-time code is required for sign-in.</p></div></div>
            <div className="feature"><span className="featureIcon">▣</span><div><strong>Restricted access</strong><p>Students cannot grant themselves administrator permissions.</p></div></div>
          </div>
        </div>
        <section className="authCard" aria-labelledby="admin-heading">
          <div className="cardTop"><div className="cardIcon">C<span>+</span></div><div><p className="overline">ADMIN PORTAL</p><h2 id="admin-heading">{codeSent ? 'Enter verification code' : 'Administrator sign in'}</h2></div></div>
          <form onSubmit={codeSent ? verifyCode : sendCode} className="authForm">
            <label>Administrator Gmail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@gmail.com" disabled={codeSent} /><small>Initial authorized email: godwingarrick198@gmail.com.</small></label>
            {codeSent && <label>Email verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code from email" /></label>}
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Please wait…' : codeSent ? 'Verify and continue' : 'Email me a verification code'} <span>↗</span></button>
            {codeSent && <button type="button" className="tab" onClick={() => { setCodeSent(false); setCode(''); setNotice(''); }}>Change email</button>}
          </form>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Admin access is checked against the authorized admin list</div>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
