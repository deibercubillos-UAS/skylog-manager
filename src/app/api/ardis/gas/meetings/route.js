import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { getWeekMeetings } from '@/lib/ardis/gas';

export async function GET() {
  const guard = guardArdisRoute();
  if (guard) return guard;

  try {
    const data = await getWeekMeetings();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
