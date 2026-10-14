import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Creziax Tools Suite | منظومة الأدوات والـ CRM المتكاملة',
  description: 'منظومة سحابية متكاملة للمبيعات والـ CRM، تسجيل الاجتماعات والشاشة، وتحميل الوسائط الرقمية',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
