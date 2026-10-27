'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Verifying your email address…');

  useEffect(() => {
    let active = true;

    async function verify() {
      const errorCode = searchParams.get('error_code');
      const errorDescription = searchParams.get('error_description');
      if (errorCode || errorDescription) {
        if (active) setMessage('Email verification failed. The link may have expired or already been used. Return to the portal and request a fresh confirmation email.');
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        if (active) setMessage('No verification code was found. Open the newest confirmation email, or return to the portal and request a fresh link.');
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (active) setMessage('We could not complete verification. The link may have expired or already been used. Return to the portal and request a fresh confirmation email.');
        return;
      }

      if (active) {
        setMessage('Email verified successfully. Redirecting you to CHM SMART ATTEND…');
        window.setTimeout(() => router.replace('/?verified=1'), 1200);
      }
    }

    void verify();
    return () => { active = false; };
  }, [router, searchParams]);

  return (
    <main className="shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="authCard" style={{ width: 'min(100%, 480px)' }}>
        <div className="cardTop">
          <div className="cardIcon">C<span>+</span></div>
          <div><p className="overline">STUDENT PORTAL</p><h2>Email verification</h2></div>
        </div>
        <p role="status" aria-live="polite" style={{ lineHeight: 1.7, margin: '24px 0' }}>{message}</p>
        <a className="submitButton" href="/" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>Return to portal <span>↗</span></a>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>Loading email verification…</main>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
