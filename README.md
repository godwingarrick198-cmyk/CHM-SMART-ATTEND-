# CHM SMART ATTEND

Mobile-friendly GPS attendance web app for CHM classes.

## Planned stack
- Next.js (App Router) + TypeScript
- Supabase Auth and Postgres
- Resend for student email verification
- OpenStreetMap-compatible mapping
- Vercel deployment

## Security requirements
- Students self-register using full name, matric number, Gmail, and passcode.
- Matric numbers must be unique.
- Students can view only their own attendance.
- Admin privileges are assigned only by an existing authorized admin and enforced server-side.
- Attendance must be verified server-side against an active session, allowed time window, and configured geofence.
- Never commit Supabase service-role keys, Resend API keys, or other secrets.

## Status
Initial project setup. Authentication, database policies, admin verification, and attendance workflows must be configured and tested before production use.
