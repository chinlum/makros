'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MEAL_LABELS, MEAL_TYPES, type MealType } from '@/lib/meals';
import { todayISO } from '@/lib/dates';
import { prepareImage, type PreparedImage } from '@/lib/image';

const supabase = createClient();
const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-gray-900 focus:outline-none';

type Entry = {
  id: number; meal_type: MealType; description: string | null;
  calories: number; protein_g: number; carbs_g: number; fats_g: number;
};

export default function FoodPage() {
  const [date, setDate] = useState(todayISO());
  
  // --- Photo Staging States Only ---
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [text, setText] = useState('');
  const [stagedMeals, setStagedMeals] = useState<any[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [aiBusy, setAiBusy] = useState<'' | 'photos' | 'analysing'>('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('food_logs')
      .select('id, meal_type, description, calories, protein_g, carbs_g, fats_g')
      .eq('date', date)
      .order('id');
    setEntries((data ?? []) as Entry[]);
  }, [date]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    setAiBusy('photos');
    try {
      const prepared = await Promise.all(files.map(prepareImage));
      setImages((prev) => [...prev, ...prepared]);
    } catch {
      setError('Could not read one of the photos. Try a JPEG or PNG.');
    } finally {
      setAiBusy('');
    }
  }

  async function analyse() {
    if (images.length === 0 && !text.trim()) return setError('Provide input elements.');
    setError(null);
    setMsg(null);
    setAiBusy('analysing');
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map(({ mimeType, data }) => ({ mimeType, data })), text }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Analysis failed.');
      const outputCards = json as any[];
      
      setStagedMeals(outputCards.map((card) => ({
        id: Math.random().toString(36).substring(7),
        mealType: card.meal_type_guess,
        desc: card.summary,
        calories: String(card.totals.calories),
        protein_g: String(card.totals.protein_g),
        carbs_g: String(card.totals.carbs_g),
        fats_g: String(card.totals.fats_g),
      })));
      
      setImages([]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setAiBusy('');
    }
  }

  async function saveStagedItem(stagedId: string) {
    const item = stagedMeals.find((m) => m.id === stagedId);
    if (!item) return;

    setError(null);
    setMsg(null);
    const { error } = await supabase.rpc('log_food', {
      p_date: date,
      p_meal_type: item.mealType,
      p_description: item.desc.slice(0, 200),
      p_calories: Number(item.calories),
      p_protein_g: Number(item.protein_g),
      p_carbs_g: Number(item.carbs_g),
      p_fats_g: Number(item.fats_g),
    });

    if (error) return setError(error.message);
    setStagedMeals((prev) => prev.filter((m) => m.id !== stagedId));
    setMsg('Staged entry saved successfully.');
    loadEntries();
  }

  async function remove(id: number) {
    const { error } = await supabase.from('food_logs').delete().eq('id', id);
    if (error) return setError(error.message);
    loadEntries();
  }

  const dayTotal = entries.reduce((a, e) => a + Number(e.calories), 0);
  return (
    <div className='mx-auto max-w-2xl space-y-6'>
      {/* Date Control */}
      <div className='rounded-xl border bg-white p-4 shadow-sm'>
        <h1 className='text-xl font-bold mb-4'>Food Logging</h1>
        <label className='mb-1 block text-sm font-medium text-gray-700'>Log Date</label>
        <input type='date' className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Main Full-Width Photo Workspace */}
      <div className='border rounded-xl bg-white p-4 space-y-4 shadow-sm'>
        <h2 className='font-bold text-gray-800 border-b pb-1.5'>Food Input</h2>
        <div>
          <label className='mb-1 block text-sm font-medium text-gray-600'>Upload Food Images (Optional)</label>
          <input type='file' accept='image/*' multiple onChange={onFiles} className='block w-full text-sm' />
          {aiBusy === 'photos' && <p className='mt-1 text-xs text-gray-500'>Compressing photos...</p>}
        </div>

        {images.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-2'>
            {images.map((img, i) => (
              <div key={i} className='relative border rounded-md p-1 bg-gray-50'>
                <span className='text-xs font-medium text-gray-600 max-w-[150px] truncate block px-1'>{img.name}</span>
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} className='absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center'>&times;</button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className='mb-1 block text-sm font-medium text-gray-600'>Extra Context Description (Optional)</label>
          <textarea className={inputCls} rows={2} maxLength={500} placeholder='Add descriptions or brands for more accuracy' value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        <button onClick={analyse} disabled={aiBusy !== '' || (images.length === 0 && !text.trim())} className='w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 transition-colors'>
          {aiBusy === 'analysing' ? 'Analysing with Gemini...' : 'Analyse via AI'}
        </button>

        {/* Staging cards generated from single API call */}
        {stagedMeals.length > 0 && (
          <div className='space-y-4 border-t pt-3'>
            {stagedMeals.map((meal) => (
              <div key={meal.id} className='flex flex-col gap-4 p-3 border rounded-xl bg-gray-50'>
                <div className='flex-1 space-y-3'>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <label className='block text-[11px] font-bold text-gray-500 uppercase'>Meal Group</label>
                      <select className={inputCls} value={meal.mealType} onChange={(e) => setStagedMeals(stagedMeals.map((m) => m.id === meal.id ? { ...m, mealType: e.target.value as MealType } : m))}>
                        {MEAL_TYPES.map((m) => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='block text-[11px] font-bold text-gray-500 uppercase'>Title / Note</label>
                      <input className={inputCls} value={meal.desc} onChange={(e) => setStagedMeals(stagedMeals.map((m) => m.id === meal.id ? { ...m, desc: e.target.value } : m))} />
                    </div>
                  </div>

                  <div className='grid grid-cols-4 gap-1 text-center text-xs'>
                    {[['calories', 'Kcal'], ['protein_g', 'P (g)'], ['carbs_g', 'C (g)'], ['fats_g', 'F (g)']].map(([field, lbl]) => (
                      <div key={field}>
                        <label className='block text-[10px] text-gray-400 font-semibold mb-0.5'>{lbl}</label>
                        <input className='w-full rounded-md border text-center p-1 bg-white focus:outline-none' value={(meal as any)[field]} onChange={(e) => setStagedMeals(stagedMeals.map((m) => m.id === meal.id ? { ...m, [field]: e.target.value } : m))} />
                      </div>
                    ))}
                  </div>

                  <div className='flex gap-2 justify-end'>
                    <button onClick={() => setStagedMeals(stagedMeals.filter((m) => m.id !== meal.id))} className='px-3 py-1 text-xs font-medium border rounded-md text-red-600 hover:bg-red-50 bg-white'>Discard</button>
                    <button onClick={() => saveStagedItem(meal.id)} className='px-4 py-1 text-xs font-medium rounded-md bg-green-700 text-white hover:bg-green-800 shadow-sm'>Confirm & Save</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Status Notices */}
      {error && <p className='text-sm text-red-600 bg-red-50 p-2 rounded-lg border'>{error}</p>}
      {msg && <p className='text-sm text-green-700 bg-green-50 p-2 rounded-lg border'>{msg}</p>}

      {/* BOTTOM RECORDS MATRIX DISPLAY */}
      <div className='rounded-xl border bg-white p-4 shadow-sm'>
        <h2 className='text-sm font-bold uppercase tracking-wider text-gray-400 mb-2'>Database Records ({Math.round(dayTotal)} kcal total)</h2>
        {entries.length === 0 ? (
          <p className='text-sm text-gray-500 italic'>No nutritional records saved for this date yet.</p>
        ) : (
          <ul className='divide-y rounded-lg border text-sm'>
            {entries.map((e) => (
              <li key={e.id} className='flex items-start justify-between gap-2 px-3 py-2.5 hover:bg-gray-50'>
                <span>
                  <b className='text-gray-900'>{MEAL_LABELS[e.meal_type]}</b>
                  {e.description && <span className='block text-xs text-gray-500 italic mt-0.5'>{e.description}</span>}
                </span>
                <span className='whitespace-nowrap text-right font-semibold'>
                  {Math.round(e.calories)} kcal
                  <span className='block text-[11px] font-normal text-gray-400 mt-0.5'>P {Math.round(e.protein_g)}g | C {Math.round(e.carbs_g)}g | F {Math.round(e.fats_g)}g</span>
                  <button onClick={() => remove(e.id)} className='text-xs text-red-500 font-normal hover:underline block ml-auto mt-0.5'>delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}