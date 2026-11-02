'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function Home() {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [level,setLevel]=useState('100');
  const prefixes:Record<string,string>={'100':'PSC26','200':'PSC25','300':'PSC24','400':'PSC23'};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/student-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: fullName.trim(), level:Number(level), matricSuffix:matricNo.trim(), email: email.trim().toLowerCase(), password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not create account. Please try again.');
        setNotice('Registration submitted. Wait for your level administrator to approve your account.');
        setMode('login');
        setPassword('');
      } else {
        const response = await fetch('/api/auth/matric-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matricNo: matricNo.trim().toUpperCase(), password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed. Please check your details.');
        const supabase = createClient();
        const { error } = await supabase.auth.setSession(result.session);
        if (error) throw error;
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
              <label>Study level<select required value={level} onChange={e=>{setLevel(e.target.value);setMatricNo("");}}><option value="100">100 Level</option><option value="200">200 Level</option><option value="300">300 Level</option><option value="400">400 Level</option></select></label><label>Matriculation number<div style={{display:"flex",gap:8,alignItems:"center"}}><strong>{prefixes[level]}</strong><input required inputMode="numeric" pattern="[0-9]+" value={matricNo} onChange={e=>setMatricNo(e.target.value.replace(/[^0-9]/g,""))} placeholder="Enter remaining digits" /></div></label>
              <label>Gmail address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" /></label>
              <label>Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            </>}
            {mode === 'login' && <>
              <label>Matriculation number<input required value={matricNo} onChange={e => setMatricNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="e.g. PSC2407896" /></label>
              <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label>
            </>}
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in to portal' : 'Create student account'} <span>↗</span></button>
          </form>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Protected student access <span className="divider">·</span> Password sign-in</div>
          <p className="fieldHint" style={{ textAlign: 'center', marginTop: 14 }}><a href="/admin">Administrator sign in →</a></p>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
