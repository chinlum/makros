'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buildWeek, type DayRow, type Profile } from '@/lib/energy';
import { toLocalISODate, todayISO } from '@/lib/dates';
import NetBalanceRow from '@/components/NetBalanceRow';
import DivergingChart from '@/components/DivergingChart';
import AiRecommendation from '@/components/AiRecommendation';

const supabase = createClient();


export default function HomePage() {
  const router = useRouter();
  const [days, setDays] = useState<DayRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('sex, birth_year, height_cm, weight_kg, activity_level, custom_step_default, updated_at')
        .maybeSingle();

      if (!profile) {
        router.replace('/profile'); 
        return;
      }

      // Establish standard chronological boundaries
      let earliestDateISO = toLocalISODate(new Date(profile.updated_at));
      let latestDateISO = todayISO(); 

      // 2. Scan logs for the absolute minimum and maximum data limits
      const [earliestFood, earliestEx, earliestSt, latestFood, latestEx, latestSt] = await Promise.all([
        supabase.from('food_logs').select('date').order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('exercise_logs').select('date').order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('step_logs').select('date').order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('food_logs').select('date').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('exercise_logs').select('date').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('step_logs').select('date').order('date', { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Determine Earliest Date
      if (earliestFood.data && earliestFood.data.date < earliestDateISO) earliestDateISO = earliestFood.data.date;
      if (earliestEx.data && earliestEx.data.date < earliestDateISO) earliestDateISO = earliestEx.data.date;
      if (earliestSt.data && earliestSt.data.date < earliestDateISO) earliestDateISO = earliestSt.data.date;

      // Determine Latest Date
      if (latestFood.data && latestFood.data.date > latestDateISO) latestDateISO = latestFood.data.date;
      if (latestEx.data && latestEx.data.date > latestDateISO) latestDateISO = latestEx.data.date;
      if (latestSt.data && latestSt.data.date > latestDateISO) latestDateISO = latestSt.data.date;

        // 3. Generate a dynamic custom timeline array in LOCAL time (avoids UTC shift)
      const [sy, sm, sd] = earliestDateISO.slice(0, 10).split('-').map(Number);
      const [ey, em, ed] = latestDateISO.slice(0, 10).split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      const activeDates: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        activeDates.push(toLocalISODate(d));
      }

      // Limit display window to a moving maximum frame of 7 columns
      const displayDates = activeDates.slice(-7); 
      if (displayDates.length === 0) displayDates.push(todayISO());

      const fromString = displayDates[0];
      const toString = displayDates[displayDates.length - 1];

      // 4. Query metrics bound inside our smart dynamic grid window
      const [food, ex, st] = await Promise.all([
        supabase.from('food_logs').select('date, calories').gte('date', fromString).lte('date', toString),
        supabase.from('exercise_logs').select('date, calories_burnt').gte('date', fromString).lte('date', toString),
        supabase.from('step_logs').select('date, calories_burnt').gte('date', fromString).lte('date', toString),
      ]);

      const err = food.error ?? ex.error ?? st.error;
      if (err) return setError(err.message);

      setDays(buildWeek(profile as Profile, displayDates, food.data ?? [], ex.data ?? [], st.data ?? []));
    })();
  }, [router]);

  if (error) return <p className='text-sm text-red-600'>Could not load data: {error}</p>;
  if (!days) return <p className='text-sm text-gray-500'>Loading...</p>;

  const weekNet = days.reduce((a, d) => a + d.net, 0);

  return (
    <div className='space-y-5'>
      {/* Step 3 Placement: Render the live-fetching AI Insights Block at the absolute top */}
      <AiRecommendation />

      <div className='flex items-baseline justify-between pt-2'>
        <h1 className='text-xl font-bold'>Your tracking journey</h1>
        <div className='flex gap-4 text-sm font-medium'>
          <Link href='/food' className='underline hover:text-gray-600'>Log food</Link>
          <Link href='/exercise' className='underline hover:text-gray-600'>Log exercise</Link>
        </div>
      </div>
      
      <section className='rounded-xl border bg-white p-3 sm:p-4 shadow-sm'>
        <NetBalanceRow days={days} />
        <div className='my-3 border-t' />
        <div className='overflow-x-auto pb-2'>
          <div className='min-w-[500px]'>
            <DivergingChart days={days} />
          </div>
        </div>
         <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600'>
          {days.some((d) => d.isFoodDefault) ? (
            <>
              <span><span className='mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500' />Energy in (logged)</span>
              <span><span className='mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-200' />Energy in (default)</span>
            </>
          ) : (
            <span><span className='mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500' />Energy in</span>
          )}
          <span><span className='mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500' />Energy out </span>
        </div>
        {days.some((d) => d.isFoodDefault) && (
          <p className='mt-1.5 text-[11px] text-gray-500'>
            Note: Default Energy In balances out Default Energy Out if no food entries are logged.
          </p>
        )}
      </section>
      
      <p className='text-sm text-gray-700 font-medium'>
        Active window net total:{' '}
        <b className={weekNet > 0 ? 'text-red-600' : weekNet < 0 ? 'text-green-600' : ''}>
          {weekNet > 0 ? '+' : ''}{weekNet.toLocaleString('en-US')} kcal
        </b>
      </p>
    </div>
  );
}