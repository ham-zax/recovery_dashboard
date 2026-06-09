import { Metadata } from 'next';
import { ProtocolsContent } from '@/components/ProtocolsContent';

export const metadata: Metadata = {
  title: 'Protocol Review | Recovery Dashboard',
  description: 'Analyze protocol efficacy and historical performance.',
};

export default function ProtocolsPage() {
  return (
    <main className="min-h-screen bg-bg-primary pt-8 px-4 md:px-8">
      <ProtocolsContent />
    </main>
  );
}
