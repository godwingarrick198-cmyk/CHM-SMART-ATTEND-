import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'CHM SMART ATTEND', description: 'Secure GPS-based attendance for CHM classes.', applicationName: 'CHM SMART ATTEND' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c1714' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
