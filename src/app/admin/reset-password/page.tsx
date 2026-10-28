'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (password.length < 8) {
      setNotice('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setNotice('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice('Password saved. You can now sign in to the admin portal.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save the password. Reopen the latest password setup email and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="ambient ambientOne" /><div className="ambient ambientTwo" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="CHM Smart Attend home"><span className="brandMark">CHM</span><span className="brandWords"><strong>SMART ATTEND</strong><small>ADMINISTRATION</small></span></a>
        <a className="secureBadge" href="/admin">← Admin sign in</a>
      </header>
      <section className="heroGrid">
        <div className="intro">
          <div className="eyebrow"><span /> SECURE PASSWORD SETUP</div>
          <h1>Set your<br /><em>password.</em></h1>
          <p className="lead">Choose a password for the initial administrator account.</p>
        </div>
        <section className="authCard" aria-labelledby="reset-heading">
          <div className="cardTop"><div className="cardIcon">C<span>+</span></div><div><p className="overline">ADMIN PORTAL</p><h2 id="reset-heading">Create administrator password</h2></div></div>
          <form onSubmit={savePassword} className="authForm">
            <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter it again" /></label>
            <button className="submitButton" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'} <span>↗</span></button>
          </form>
          {notice && <div className="notice" role="status">{notice}</div>}
          <div className="cardBottom"><span className="lockIcon">▣</span> Only the authorized administrator account is allowed</div>
        </section>
      </section>
      <footer className="footer"><span>CHM SMART ATTEND</span><span>Attendance made accountable.</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
