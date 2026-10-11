import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Apex AI Sales & CRM | نظام المبيعات والتسويق الذاتي',
  description: 'نظام متكامل ومجاني للتنقيب عن العملاء عبر يوتيوب، صياغة العروض بالذكاء الاصطناعي، وإرسال الإيميلات الآلية',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased min-h-screen flex bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
          <Navbar />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
