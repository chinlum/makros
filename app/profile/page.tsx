'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { currentUserId } from '@/lib/identity';
import { bmr, baselineOut, calcAge } from '@/lib/energy';

const supabase = createClient();
const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-gray-900 focus:outline-none';
const labelCls = 'mb-1 block text-sm font-medium';

export default function ProfilePage() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState('lightly_active');
  const [steps, setSteps] = useState('5000');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Load the saved profile (if any) when the page opens.
  useEffect(() => {
    supabase.from('profiles').select('*').maybeSingle().then(({ data }) => {
      if (!data) return;
      setSex(data.sex);
      setBirthYear(String(data.birth_year ?? ''));
      setHeight(String(data.height_cm));
      setWeight(String(data.weight_kg));
      setActivity(data.activity_level ?? 'lightly_active');
      setSteps(String(data.custom_step_default));
    });
  }, []);

 const by = Number(birthYear), h = Number(height), w = Number(weight);
 const valid = by >= 1900 && by <= new Date().getFullYear() - 10 && h > 0 && w > 0;
 const p = { sex, birth_year: by, height_cm: h, weight_kg: w };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('profiles').upsert({
      id: await currentUserId(),
      updated_at: new Date().toISOString(),
      sex, birth_year: by, height_cm: h, weight_kg: w,
      activity_level: activity,
      custom_step_default: Number(steps),
    });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Saved.' });
  }

  return (
    <div className='mx-auto max-w-sm space-y-6'>
      <h1 className='mb-1 text-2xl font-bold'>Your profile</h1>
      <p className='mb-5 text-sm text-gray-600'>Metric units only: centimetres and kilograms.</p>
      <form onSubmit={save} className='space-y-4'>
        <div>
          <label className={labelCls}>Sex (used in the BMR formula)</label>
          <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value as 'male' | 'female')}>
            <option value='male'>Male</option>
            <option value='female'>Female</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Birth year (e.g. 1996)</label>
  <input className={inputCls} inputMode='numeric' required placeholder='YYYY' value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Height (cm)</label>
          <input className={inputCls} inputMode='decimal' required value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Weight (kg)</label>
          <input className={inputCls} inputMode='decimal' required value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Activity level (stored for reference; not used in the maths)</label>
          <select className={inputCls} value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value='sedentary'>Sedentary</option>
            <option value='lightly_active'>Lightly active</option>
            <option value='moderately_active'>Moderately active</option>
            <option value='very_active'>Very active</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Default daily steps (used on days you log nothing)</label>
          <input className={inputCls} inputMode='numeric' required value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>

        {valid && (
          <div className='rounded-lg bg-gray-100 p-3 text-sm'>
            BMR: <b>{Math.round(bmr(p))}</b> kcal/day. Baseline burn before steps and exercise:{' '}
            <b>{Math.round(baselineOut({ ...p, activity_level: null, custom_step_default: 0 }))}</b> kcal/day.
          </div>
        )}
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button disabled={busy || !valid} className='w-full rounded-lg bg-gray-900 py-2.5 font-medium text-white disabled:opacity-50'>
          {busy ? 'Saving...' : 'Save profile'}
        </button>
      </form>
       {/* Data Backup & Export Section */}
      <div className='border-t pt-5'>
        <h2 className='mb-1 text-base font-bold'>Backup & Export</h2>
        <p className='mb-3 text-xs text-gray-600'>
          Download your profile, food logs, exercises, and step history as a multi-tab Excel spreadsheet.
        </p>
        <a
          href='/api/export-data'
          download
          className='block w-full rounded-lg border border-gray-300 bg-white py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors'
        >
          Download Excel (.xlsx)
        </a>
      </div>
    </div>
  );
}
