# Setup and deployment

## Supabase
1. Create a Supabase project.
2. Review and run supabase/schema.sql in the SQL Editor.
3. Enable email confirmation in Authentication settings.
4. Configure production SMTP for reliable student verification. Resend requires a verified sending domain for production use.
5. Add local and deployed URLs to the allowed redirect URLs.

## Environment variables
Set these in local .env.local and Vercel Project Settings > Environment Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (or supported publishable key)
- SUPABASE_SERVICE_ROLE_KEY (server-only; never use a NEXT_PUBLIC_ prefix)
- RESEND_API_KEY (server-only)
- RESEND_FROM_EMAIL
- INITIAL_ADMIN_PHONE (reserved for secure first-admin provisioning)

Never commit real secrets to GitHub or paste secret keys into chat.

## Vercel
Import repository godwingarrick198-cmyk/CHM-SMART-ATTEND-. Choose the Next.js preset and add environment variables before production deployment.

## Current status
This is an initial responsive student-facing UI and database schema draft, not production-ready. Matric-number login needs a secure server-side lookup. Admin phone verification needs an OTP delivery method/provider. Server-side GPS check-in, one-time profile edit enforcement, admin management UI, dashboards, and testing are still required.
