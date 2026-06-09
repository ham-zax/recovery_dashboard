import { DashboardContent } from '@/components/DashboardContent';
import { ProtocolStrip } from '@/components/ProtocolBanner';

export default function DashboardPage() {
  return <DashboardContent protocolStrip={<ProtocolStrip />} />;
}
