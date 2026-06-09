import { prisma } from '@/lib/prisma';
import { WeeklyReviewContent } from '@/components/WeeklyReviewContent';

export default async function ReviewPage() {
  const startDateSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_start_date' },
  });

  const durationSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_duration_days' },
  });

  const protocolStartDateStr = startDateSetting ? startDateSetting.value : '2026-06-09';
  const totalDurationDays = durationSetting ? parseInt(durationSetting.value, 10) : 84;

  return (
    <WeeklyReviewContent
      protocolStartDateStr={protocolStartDateStr}
      totalDurationDays={totalDurationDays}
    />
  );
}
