import type { DayRow } from '@/lib/energy';

const HALF = 170;  // pixel height of the upper half and of the lower half
const LABEL = 18;  // pixels reserved for the number label

export default function DivergingChart({ days }: { days: DayRow[] }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.energyIn, d.energyOut]));
  const h = (v: number) => Math.round((v / max) * (HALF - LABEL));
  const labelCls = 'block text-center text-[10px] font-semibold leading-[18px] sm:text-xs';

  return (
    <div className='grid grid-cols-7' role='img' aria-label='Seven day chart of energy in and energy out'>
      {days.map((d) => (
        <div key={d.date} className='flex flex-col'>
          {/* UPPER half: Energy In, softer red if using default baseline, solid red when food is logged */}
          <div className='flex flex-col items-center justify-end px-0.5 sm:px-1.5' style={{ height: HALF }}>
            <span className={`${labelCls} ${d.isFoodDefault ? 'text-red-400' : 'text-gray-800'}`}>
              {d.energyIn.toLocaleString('en-US')}
            </span>
            <div
              className={`w-full rounded-t-sm ${d.isFoodDefault ? 'bg-red-200' : 'bg-red-500'}`}
              style={{ height: h(d.energyIn) }}
            />
          </div>

          {/* ZERO line: full column width, so it is continuous across all 7 days */}
          <div className='h-px w-full bg-gray-900' />

          {/* LOWER half: Energy Out, green, grows down from the zero line, label at the bottom tip */}
          <div className='flex flex-col items-center justify-start px-0.5 sm:px-1.5' style={{ height: HALF }}>
            <div className='w-full rounded-b-sm bg-green-500' style={{ height: h(d.energyOut) }} />
            <span className={`${labelCls} text-gray-800`}>{d.energyOut.toLocaleString('en-US')}</span>
          </div>

          <div className='pt-1 text-center text-[10px] text-gray-500 sm:text-xs'>{d.label}</div>
        </div>
      ))}
    </div>
  );
}