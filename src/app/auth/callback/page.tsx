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
      if (errorCode || searchParams.get('error_description')) {
        if (active) setMessage('This sign-in link could not be used. It may have expired or already been used. Return to the portal and request a new link.');
        return;
      }

      const supabase = createClient();
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      let error: { message: string } | null = null;
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (tokenHash && (type === 'magiclink' || type === 'signup' || type === 'email')) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'magiclink' | 'signup' | 'email',
        });
        error = result.error;
      } else {
        if (active) setMessage('No valid sign-in token was found. Return to the portal and request a new link.');
        return;
      }

      if (error) {
        if (active) setMessage('We could not complete sign-in. The link may have expired or already been used. Return to the portal and request a new link.');
        return;
      }

      if (active) {
        setMessage('Sign-in successful. Redirecting you to CHM SMART ATTEND…');
        window.setTimeout(() => router.replace('/?verified=1'), 800);
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
