'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuditAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [router]);

  return <div className="mb-4 text-xs text-slate-400">Auto-refresh every 5s</div>;
}
