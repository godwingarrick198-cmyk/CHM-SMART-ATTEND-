'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function Home() {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: passcode,
          options: { emailRedirectTo: 'https://chm-smart-attend.vercel.app/auth/callback', data: { full_name: fullName.trim(), matric_no: matricNo.trim().toUpperCase() } }
        });
        if (error) throw error;
        setNotice('Registration submitted. Your student profile is created automatically. Check your Gmail and confirm your email before logging in.');
      } else {
        const response = await fetch('/api/auth/matric-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricNo: matricNo.trim().toUpperCase(), password: passcode }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed. Please try again.');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="ambient ambientOne" /><div className="ambient ambientTwo" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="CHM Smart Attend home"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>CHEMISTRY DEPARTMENT</small></span></a>
        <span className="secureBadge"><span className="statusDot" /> GPS-VERIFIED ATTENDANCE</span>
      </header>
      <section className="heroGrid">
        <div className="intro">
          <div className="eyebrow"><span /> SMARTER CLASSROOMS START HERE</div>
          <h1>Show up.<br /><em>Get counted.</em></h1>
          <p className="lead">A clearer way to track CHM class attendance. Sign in to view your progress, or create your student account to get started.</p>
          <div className="featureList">
            <div className="feature"><span className="featureIcon">◎</span><div><strong>Location-aware check-in</strong><p>Attendance can only be submitted within the approved class zone and active session.</p></div></div>
            <div className="feature"><span className="featureIcon">◌</span><div><strong>Your progress, at a glance</strong><p>Track attendance toward your course target with a clear percentage gauge.</p></div></div>
            <div className="feature"><span className="featureIcon">⌁</span><div><strong>Student-first privacy</strong><p>Your account is designed to show your own attendance records only.</p></div></div>
          </div>
          <div className="heroFoot"><span className="miniShield">✓</span> Built for the CHM classroom · Mobile friendly</div>
        </div>
        <section className="authCard" aria-labelledby="auth-heading">
          <div className="cardTop"><div className="cardIcon">C<span>+</span></div><div><p className="overline">STUDENT PORTAL</p><h2 id="auth-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2></div></div>
          <div className="tabs" role="tablist" aria-label="Account options">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => { setMode('login'); setNotice(''); }}>Log in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'tab active' : 'tab'} onClick={() => { setMode('signup'); setNotice(''); }}>Create account</button>
          </div>
          <form onSubmit={handleSubmit} className="authForm">
            {mode === 'signup' && <>
              <label>Full name<input autoComplete="name" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your name" /></label>
              <label>Matriculation number<input required value={matricNo} onChange={e => setMatricNo(e.target.value)} placeholder="e.g. CHM/2024/0001" /></label>
              <label>Gmail address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" /></label>
            </>}
            {mode === 'login' && <>
              <label>Matriculation number<input required value={matricNo} onChange={e => setMatricNo(e.target.value)} placeholder="Enter your matric number" /></label>
              <p className="fieldHint">No password needed. We’ll email a secure sign-in link to the address registered with your matric number.</p>
            </>}
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in to portal' : 'Create student account'} <span>↗</span></button>
          </form>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Protected student access <span className="divider">·</span> Email link sign-in</div>
          <p className="fieldHint" style={{ textAlign: 'center', marginTop: 14 }}><a href="/admin">Administrator sign in →</a></p>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
