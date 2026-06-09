import { Metadata } from 'next';
import { ProtocolDetailContent } from '@/components/ProtocolDetailContent';

export const metadata: Metadata = {
  title: 'Protocol Details | Recovery Dashboard',
  description: 'Detailed analysis of a specific protocol version.',
};

export default function ProtocolDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-bg-primary pt-8 px-4 md:px-8">
      <ProtocolDetailContent protocolId={params.id} />
    </main>
  );
}
