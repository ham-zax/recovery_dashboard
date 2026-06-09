import { prisma } from '@/lib/prisma';
import { WeeklyReviewContent } from '@/components/WeeklyReviewContent';
import { getWeeklyReviewData } from '@/lib/reviewData';
import { format, addDays } from 'date-fns';
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
  const protocolStartDate = new Date(y, m - 1, d);
  const today = startOfDayUtc(new Date());
  
  const totalWeeks = Math.ceil(totalDurationDays / 7);
  let computedIndex = 0;
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addDays(protocolStartDate, i * 7);
    const weekEnd = addDays(weekStart, 6);
    if (today >= weekStart && today <= weekEnd) {
      computedIndex = i;
      break;
    }
  }
  
  const lastWeekEnd = addDays(addDays(protocolStartDate, (totalWeeks - 1) * 7), 6);
  if (today > lastWeekEnd) {
    computedIndex = totalWeeks - 1;
  }
  
  const initialWeekStartDate = addDays(protocolStartDate, computedIndex * 7);
  const initialData = await getWeeklyReviewData(format(initialWeekStartDate, 'yyyy-MM-dd'));

  return (
    <WeeklyReviewContent
      protocolStartDateStr={protocolStartDateStr}
      totalDurationDays={totalDurationDays}
      initialWeekIndex={computedIndex}
      initialData={initialData}
    />
  );
}
