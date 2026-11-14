import type { DayRow } from '@/lib/energy';

const fmt = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US');

export default function NetBalanceRow({ days }: { days: DayRow[] }) {
  return (
    <div>
      <div className='mb-1 text-xs font-medium uppercase tracking-wide text-gray-500'>Net balance (kcal)</div>
      <div className='grid grid-cols-7'>
        {days.map((d) => {
          const color = d.net > 0 ? 'text-red-600' : d.net < 0 ? 'text-green-600' : 'text-gray-500';
          return (
            <div key={d.date} className='px-0.5 text-center'>
              <div className='text-[10px] text-gray-500 sm:text-xs'>{d.label}</div>
              <div className={`text-xs font-bold sm:text-base ${color}`}>{fmt(d.net)}</div>
            </div>
          );
        })}
      </div>
      <div className='mt-1 text-[11px] text-gray-500'>Red = surplus, Green = deficit</div>
    </div>
  );
}
