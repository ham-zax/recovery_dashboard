'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DateRedirect() {
  const router = useRouter();

  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    router.replace(`/checkin?date=${localDateStr}`);
  }, [router]);

  return (
    <div className="flex justify-center items-center h-64 text-text-secondary font-medium animate-pulse">
      Loading your check-in...
    </div>
  );
}
