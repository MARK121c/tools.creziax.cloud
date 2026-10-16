'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServerRecorderRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tools/meeting-recorder');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
      <span>جاري الانتقال إلى استوديو تسجيل الاجتماعات الموحد...</span>
    </div>
  );
}
