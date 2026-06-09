import { DashboardContent } from '@/components/DashboardContent';
import { ProtocolStrip } from '@/components/ProtocolBanner';
import { getDashboardData } from '@/lib/aggregations';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const initialData = await getDashboardData(7);
  return (
    <DashboardContent
      protocolStrip={<ProtocolStrip />}
      initialData={initialData}
    />
  );
}
