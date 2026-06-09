import { Metadata } from 'next';
import { ProtocolsContent } from '@/components/ProtocolsContent';
import { getProtocolStats, getProtocolTimeline } from '@/lib/protocolQueries';

export const metadata: Metadata = {
  title: 'Protocol Review | Recovery Dashboard',
  description: 'Analyze protocol efficacy and historical performance.',
};

export const dynamic = 'force-dynamic';

export default async function ProtocolsPage() {
  const [protocols, timeline] = await Promise.all([
    getProtocolStats(),
    getProtocolTimeline()
  ]);

  return (
    <main className="min-h-screen bg-bg-primary pt-8 px-4 md:px-8">
      <ProtocolsContent initialProtocols={protocols} initialTimeline={timeline} />
    </main>
  );
}
