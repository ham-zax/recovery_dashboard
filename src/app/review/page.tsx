import { prisma } from '@/lib/prisma';
import { WeeklyReviewContent } from '@/components/WeeklyReviewContent';
import { getWeeklyReviewData } from '@/lib/reviewData';
import { format, addDays } from 'date-fns';

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

  const protocolStartDate = new Date(protocolStartDateStr);
  const today = new Date();
  
  const totalWeeks = Math.ceil(totalDurationDays / 7);
  let computedIndex = 0;
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addDays(protocolStartDate, i * 7);
    // Use endOfDay logic or just check days. Wait, we want simple comparison.
    // Let's use the exact same comparison as in the client to avoid differences.
    const weekEnd = addDays(weekStart, 6);
    // Fix: the client does `today <= weekEnd`, but weekEnd is 00:00:00 of that day.
    // If today is on weekEnd but later in the day, today <= weekEnd is false.
    // Wait, the client used `addDays(weekStart, 6)` which is 00:00:00.
    // If we want it to be robust, we should do `weekEnd = endOfDay(addDays(weekStart, 6))`
    // Let's keep it simple as the client had it.
    if (today >= weekStart && today <= new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1)) {
      computedIndex = i;
      break;
    }
  }
  if (today > new Date(addDays(protocolStartDate, (totalWeeks - 1) * 7 + 6).getTime() + 24 * 60 * 60 * 1000 - 1)) {
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
