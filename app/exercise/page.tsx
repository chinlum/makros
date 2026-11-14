'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { currentUserId } from '@/lib/identity';
import { MET_TABLE, findMet } from '@/lib/met';
import { exerciseCalories, stepCalories } from '@/lib/energy';
import { todayISO } from '@/lib/dates';

const supabase = createClient();
const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-gray-900 focus:outline-none';

type Prof = { weight_kg: number; custom_step_default: number };
type Draft = { name: string; minutes: number; met: number };
type SavedExercise = { id: number; activity_name: string; duration_minutes: number; calories_burnt: number };

export default function ExercisePage() {
  // --- Shared Layout State ---
  const [profile, setProfile] = useState<Prof | null | undefined>(undefined);
  const [date, setDate] = useState(todayISO());
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Workouts State ---
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);
  const [pick, setPick] = useState('walking_moderate');
  const [minutes, setMinutes] = useState('30');
  const [text, setText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  // --- Steps State ---
  const [stepOverride, setStepOverride] = useState<number | null>(null);
  const [stepInput, setStepInput] = useState('');

  // 1. Fetch User Profile Background
  useEffect(() => {
    supabase.from('profiles').select('weight_kg, custom_step_default').maybeSingle().then(({ data }) => {
      setProfile(data ? { weight_kg: Number(data.weight_kg), custom_step_default: data.custom_step_default } : null);
    });
  }, []);

  // 2. Fetch Aggregated Logs (Workouts + Steps)
  const loadDailyLogs = useCallback(async () => {
    if (!profile) return;
    setMsg(null);
    setError(null);

    const exRes = await supabase
      .from('exercise_logs')
      .select('id, activity_name, duration_minutes, calories_burnt')
      .eq('date', date)
      .order('id');
    setSavedExercises((exRes.data ?? []) as SavedExercise[]);

    const stepRes = await supabase
      .from('step_logs')
      .select('step_count')
      .eq('date', date)
      .maybeSingle();
    
    setStepOverride(stepRes.data ? stepRes.data.step_count : null);
    setStepInput(stepRes.data ? String(stepRes.data.step_count) : '');
  }, [date, profile]);

  useEffect(() => {
    if (profile !== undefined) {
      loadDailyLogs();
    }
  }, [date, profile, loadDailyLogs]);

  if (profile === undefined) return <p className='text-sm text-gray-500'>Loading...</p>;
  if (profile === null) return <p className='text-sm'>Save your <Link href='/profile' className='underline'>profile</Link> first.</p>;

  const effectiveSteps = stepOverride ?? profile.custom_step_default;
  const stepKcal = Math.round(stepCalories(profile.weight_kg, effectiveSteps));
  const exKcal = (d: Draft) => Math.round(exerciseCalories(d.met, profile.weight_kg, d.minutes));

  // --- Action Handlers: Steps ---
  async function saveSteps() {
    const steps = Math.round(Number(stepInput));
    if (!profile || !Number.isFinite(steps) || steps < 0) return setError('Enter a valid step count.');
    setError(null);
    const { error } = await supabase.from('step_logs').upsert(
      {
        user_id: await currentUserId(),
        date,
        step_count: steps,
        calories_burnt: Math.round(stepCalories(profile.weight_kg, steps)),
        is_default_placeholder: false,
      },
      { onConflict: 'user_id,date' }
    );
    if (error) return setError(error.message);
    setStepOverride(steps);
    setMsg('Steps updated.');
  }

  async function resetSteps() {
    const { error } = await supabase.from('step_logs').delete().eq('date', date).eq('user_id', await currentUserId());
    if (error) return setError(error.message);
    setStepOverride(null);
    setStepInput('');
    setMsg('Steps reset to default.');
  }

  // --- Action Handlers: Workouts ---
  function addLocalExercise() {
    const entry = findMet(pick);
    const m = Number(minutes);
    if (!entry || !(m > 0)) return;
    setDrafts((d) => [...d, { name: entry.label, minutes: m, met: entry.met }]);
  }

  async function askAi() {
    setError(null);
    setMsg(null);
    setAiBusy(true);
    try {
      const res = await fetch('/api/analyze-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed.');
      const found = (json.activities as any[]).map((a) => ({
        name: a.name,
        minutes: a.duration_minutes,
        met: findMet(a.matched_key)?.met ?? a.met
      }));
      if (found.length === 0) setError('No exercise found in that text.');
      setDrafts((d) => [...d, ...found]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setAiBusy(false);
    }
  }

  async function saveAllExercises() {
    if (drafts.length === 0) return;
    setBusy(true);
    setError(null);
    const uid = await currentUserId();
    const rows = drafts.map((d) => ({
      user_id: uid,
      date,
      activity_name: d.name,
      duration_minutes: d.minutes,
      calories_burnt: exKcal(d),
    }));
    const { error } = await supabase.from('exercise_logs').insert(rows);
    setBusy(false);
    if (error) return setError(error.message);
    setMsg(`Saved ${rows.length} workout(s).`);
    setDrafts([]);
    loadDailyLogs();
  }

  async function removeExercise(id: number) {
    const { error } = await supabase.from('exercise_logs').delete().eq('id', id);
    if (error) return setError(error.message);
    loadDailyLogs();
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      {/* Date Bar */}
      <div className='rounded-xl border bg-white p-4 shadow-sm'>
        <label className='mb-1 block text-sm font-medium text-gray-700'>Tracking Date</label>
        <input type='date' className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Left Card: Steps */}
        <div className='space-y-4 rounded-xl border bg-white p-4 shadow-sm h-fit'>
          <h2 className='text-lg font-bold text-gray-900 border-b pb-2'>Daily Steps</h2>
          <p className='text-sm text-gray-600'>
            Counting <b>{effectiveSteps.toLocaleString('en-SG')}</b> steps ({stepOverride === null ? 'profile default' : 'override'}), burning about <b>{stepKcal}</b> kcal.
          </p>
          <div className='flex gap-2'>
            <input className={inputCls} inputMode='numeric' placeholder='Steps for this day' value={stepInput} onChange={(e) => setStepInput(e.target.value)} />
            <button onClick={saveSteps} className='rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors'>Save</button>
          </div>
          {stepOverride !== null && (
            <button onClick={resetSteps} className='text-xs text-gray-500 underline hover:text-gray-900 block'>
              Reset to default baseline
            </button>
          )}
        </div>

        {/* Right Card: Workouts */}
        <div className='space-y-4 rounded-xl border bg-white p-4 shadow-sm'>
          <h2 className='text-lg font-bold text-gray-900 border-b pb-2'>Workouts & Activity</h2>
          
          <div className='space-y-2'>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block'>Quick Pick</label>
            <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
              {MET_TABLE.map((m) => <option key={m.key} value={m.key}>{m.label} (MET {m.met})</option>)}
            </select>
            <div className='flex gap-2'>
              <input className={inputCls} inputMode='numeric' value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <span className='self-center text-sm font-medium text-gray-500'>min</span>
              <button onClick={addLocalExercise} className='rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors'>Add</button>
            </div>
          </div>

          <div className='space-y-2 pt-2 border-t border-dashed'>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block'>AI Prompt</label>
            <textarea className={inputCls} rows={2} maxLength={500} placeholder='Swam 40 minutes then 15 minutes of stretching' value={text} onChange={(e) => setText(e.target.value)} />
            <button onClick={askAi} disabled={aiBusy || !text.trim()} className='w-full rounded-lg border border-gray-900 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-40 transition-colors'>
              {aiBusy ? 'Interpreting...' : 'Interpret with AI'}
            </button>
          </div>

          {drafts.length > 0 && (
            <div className='space-y-2 border-t pt-3'>
              <p className='text-sm font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded'>Ready to save:</p>
              <ul className='divide-y rounded-lg border text-sm max-h-40 overflow-y-auto'>
                {drafts.map((d, i) => (
                  <li key={i} className='flex items-center justify-between gap-2 px-3 py-2 bg-white'>
                    <span>{d.name} <span className='text-gray-400'>({d.minutes}m)</span></span>
                    <span className='whitespace-nowrap font-medium'>{exKcal(d)} kcal</span>
                  </li>
                ))}
              </ul>
              <button onClick={saveAllExercises} disabled={busy} className='w-full rounded-lg bg-green-700 py-2 font-medium text-white hover:bg-green-800 transition-colors'>
                {busy ? 'Saving...' : `Save Workouts to ${date}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Status Notices */}
      {error && <p className='text-sm text-red-600 bg-red-50 p-2 rounded-lg'>{error}</p>}
      {msg && <p className='text-sm text-green-700 bg-green-50 p-2 rounded-lg'>{msg}</p>}

      {/* Bottom Log Stack */}
      <div className='rounded-xl border bg-white p-4 shadow-sm'>
        <h3 className='mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider'>Saved Logs for this Date</h3>
        {savedExercises.length === 0 ? (
          <p className='text-sm text-gray-500 italic'>No formal workouts logged for this date yet.</p>
        ) : (
          <ul className='divide-y rounded-lg border text-sm'>
            {savedExercises.map((s) => (
              <li key={s.id} className='flex items-center justify-between gap-2 px-3 py-2 bg-gray-50'>
                <span>{s.activity_name} <span className='text-gray-400'>({s.duration_minutes} min)</span></span>
                <span className='whitespace-nowrap text-gray-600 font-medium'>
                  {Math.round(s.calories_burnt)} kcal
                  <button onClick={() => removeExercise(s.id)} className='ml-3 text-xs text-red-500 font-normal hover:underline'>delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
