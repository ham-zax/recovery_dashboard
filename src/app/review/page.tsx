import { prisma } from '@/lib/prisma';
import { WeeklyReviewContent } from '@/components/WeeklyReviewContent';
import { getWeeklyReviewData } from '@/lib/reviewData';

import { startOfDayUtc } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const startDateSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_start_date' },
  });

  const durationSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_duration_days' },
  });

  const protocolStartDateStr = startDateSetting ? startDateSetting.value : '2026-06-09';
  const totalDurationDays = durationSetting ? parseInt(durationSetting.value, 10) : 84;

  const [y, m, d] = protocolStartDateStr.split('-').map(Number);
  const protocolStartDate = new Date(Date.UTC(y, m - 1, d));
  const today = startOfDayUtc(new Date());
  
  const totalWeeks = Math.ceil(totalDurationDays / 7);
  let computedIndex = 0;
  
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(protocolStartDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    if (today >= weekStart && today <= weekEnd) {
      computedIndex = i;
      break;
    }
  }
  
  const lastWeekEnd = new Date(protocolStartDate.getTime() + (totalWeeks * 7 - 1) * 24 * 60 * 60 * 1000);
  if (today > lastWeekEnd) {
    computedIndex = totalWeeks - 1;
  }
  
  const initialWeekStartDate = new Date(protocolStartDate.getTime() + computedIndex * 7 * 24 * 60 * 60 * 1000);
  const initialWeekStartDateStr = initialWeekStartDate.toISOString().split('T')[0];
  const initialData = await getWeeklyReviewData(initialWeekStartDateStr);

  return (
    <WeeklyReviewContent
      protocolStartDateStr={protocolStartDateStr}
      totalDurationDays={totalDurationDays}
      initialWeekIndex={computedIndex}
      initialData={initialData}
    />
  );
}
