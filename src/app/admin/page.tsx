'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [phone, setPhone] = useState('+2349040990633');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const normalized = phone.replace(/[\s()-]/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
        throw new Error('Enter the phone number in international format, e.g. +2349040990633.');
      }
      const { error } = await createClient().auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      setPhone(normalized);
      setCodeSent(true);
      setNotice('Verification code requested. If SMS delivery is configured in Supabase, check your phone.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not request a code.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.replace(/[\s()-]/g, ''),
        token: code.trim(),
        type: 'sms'
      });
      if (error) throw error;
      if (!data.user) throw new Error('Verification did not return a user.');
      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('id, phone_e164, active')
        .eq('auth_user_id', data.user.id)
        .eq('active', true)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error('This verified number is not linked to an active administrator. Ask an existing admin to authorize it.');
      }
      window.location.href = '/admin/dashboard';
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Code verification failed.');
    } finally {
      setBusy(false);
    }
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
          <p className="lead">Verify the administrator phone number with a one-time SMS code. Only numbers already authorized in the admin list can enter the dashboard.</p>
          <div className="featureList">
            <div className="feature"><span className="featureIcon">✓</span><div><strong>Phone verification</strong><p>A one-time code is required for each new sign-in.</p></div></div>
            <div className="feature"><span className="featureIcon">▣</span><div><strong>Restricted access</strong><p>Students cannot grant themselves administrator permissions.</p></div></div>
          </div>
        </div>
        <section className="authCard" aria-labelledby="admin-heading">
          <div className="cardTop"><div className="cardIcon">C<span>+</span></div><div><p className="overline">ADMIN PORTAL</p><h2 id="admin-heading">{codeSent ? 'Enter verification code' : 'Administrator sign in'}</h2></div></div>
          <form onSubmit={codeSent ? verifyCode : sendCode} className="authForm">
            <label>Administrator phone number<input type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+2349040990633" disabled={codeSent} /><small>Use international format. Initial authorized number: +2349040990633.</small></label>
            {codeSent && <label>SMS verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" /></label>}
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Please wait…' : codeSent ? 'Verify and continue' : 'Send verification code'} <span>↗</span></button>
            {codeSent && <button type="button" className="tab" onClick={() => { setCodeSent(false); setCode(''); setNotice(''); }}>Use a different number</button>}
          </form>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Admin access is verified server-side</div>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
