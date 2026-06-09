import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/aggregations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysStr = searchParams.get('days') ?? '7';
    let days = parseInt(daysStr, 10);

    if (isNaN(days) || ![7, 30, 90].includes(days)) {
      days = 7;
    }

    const data = await getDashboardData(days);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
