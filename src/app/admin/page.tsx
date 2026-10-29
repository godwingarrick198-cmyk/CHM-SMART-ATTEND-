'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ADMIN_EMAIL = 'godwingarrick198@gmail.com';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');


  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
      if (error) throw new Error('Sign-in failed. Check the administrator password and try again.');
      if (!data.user) throw new Error('Sign-in did not return an administrator account.');
      const { data: admin, error: adminError } = await supabase.from('admin_users').select('id').eq('auth_user_id', data.user.id).eq('active', true).maybeSingle();
      if (adminError) throw new Error('Could not verify administrator access. Please try again.');
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error('This account is not linked to an active administrator.');
      }
      window.location.href = '/admin/dashboard';
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sign in. Please try again.');
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
          <p className="lead">Sign in to the administrator account using its password. No email code is required.</p>
          <div className="featureList">
            <div className="feature"><span className="featureIcon">✓</span><div><strong>Restricted access</strong><p>Only the authorized administrator account can enter.</p></div></div>
            <div className="feature"><span className="featureIcon">▣</span><div><strong>Controlled administration</strong><p>Only an active administrator can manage attendance and future admin access.</p></div></div>
          </div>
        </div>
        <section className="authCard" aria-labelledby="admin-heading">
          <div className="cardTop"><div className="cardIcon">C<span>+</span></div><div><p className="overline">ADMIN PORTAL</p><h2 id="admin-heading">Administrator sign in</h2></div></div>
          <form onSubmit={signIn} className="authForm">
            <label>Authorized administrator Gmail<input type="email" autoComplete="username" value={ADMIN_EMAIL} readOnly /><small>Initial administrator: godwingarrick198@gmail.com.</small></label>
            <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter administrator password" /></label>
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin dashboard'} <span>↗</span></button>
          </form>

          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Public administrator signup is disabled</div>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
