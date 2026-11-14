'use client';

import { useEffect, useState } from 'react';

type RecommendationData = {
  generatedForDate: string;
  recommendedFoodKcal: number;
  recommendedExerciseKcal: number;
  macroTargets: string;
  dietaryAnalysis: string;
  exerciseStrategy: string;
};

export default function AiRecommendation() {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on page load so your previous advice isn't lost
  useEffect(() => {
    const cached = localStorage.getItem('macro_tracker_ai_advice');
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch {
        localStorage.removeItem('macro_tracker_ai_advice');
      }
    }
  }, []);

  async function fetchRecommendation() {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/recommendation');
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to compile data.');
      }
      
      const json = await res.json();
      setData(json);
      
      // Cache the response locally
      localStorage.setItem('macro_tracker_ai_advice', JSON.stringify(json));
    } catch (err: any) {
      setError(err.message || 'Could not reach AI engine.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className='rounded-xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm space-y-4'>
      {/* Control Row */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-blue-100/60 pb-3'>
        <div>
          <h2 className='text-sm font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5'>
            {/* Cleaned text layout style applied here */}
            {data ? `AI Strategy for ${data.generatedForDate}` : 'AI Maintenance Strategy'}
          </h2>
          <p className='text-[11px] text-blue-600 mt-0.5 leading-tight font-medium'>
            {!data && 'No strategy generated yet today.'}
            {data && 'Personalised targets derived from your actual 3-day history logs.'}
          </p>
        </div>
        
        <button
          onClick={fetchRecommendation}
          disabled={loading}
          className='rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm'
        >
          {loading ? 'Analyzing Data...' : data ? 'Refresh Recommendation' : 'Generate Recommendation'}
        </button>
      </div>

      {/* Error Output Frame */}
      {error && (
        <div className='rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700 font-medium'>
          ⚠️ AI Coach Error: {error}
        </div>
      )}

      {/* Loading Skeleton Box */}
      {loading && (
        <div className='animate-pulse flex flex-col gap-2 pt-2'>
          <div className='h-3 bg-blue-200 rounded w-1/3' />
          <div className='h-3 bg-blue-100 rounded w-3/4' />
          <div className='h-3 bg-blue-100 rounded w-1/2' />
        </div>
      )}

      {/* Render Substantive Insights Blocks */}
      {!loading && data && (
        <div className='space-y-4 pt-1'>
          {/* Target Stats Grid */}
          <div className='grid grid-cols-2 gap-3 text-center'>
            <div className='bg-white p-2.5 rounded-lg border border-blue-100/60 shadow-sm'>
              <span className='block text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Food Ceiling</span>
              <span className='text-lg font-extrabold text-blue-900'>{data.recommendedFoodKcal.toLocaleString()}</span>
              <span className='block text-[9px] text-gray-400 font-medium mt-0.5'>kcal budget</span>
            </div>
            <div className='bg-white p-2.5 rounded-lg border border-blue-100/60 shadow-sm'>
              <span className='block text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Workout Target</span>
              <span className='text-lg font-extrabold text-green-700'>+{data.recommendedExerciseKcal.toLocaleString()}</span>
              <span className='block text-[9px] text-gray-400 font-medium mt-0.5'>kcal active burn</span>
            </div>
          </div>

          {/* Core Insights Text Matrices */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed'>
            <div className='space-y-3'>
              <div>
                <h3 className='font-bold text-blue-900 mb-0.5'>🥦 Nutrient & Pattern Analysis</h3>
                <p className='text-gray-700 bg-white/50 p-2 rounded-lg border border-blue-50'>{data.dietaryAnalysis}</p>
              </div>
              <div>
                <h3 className='font-bold text-blue-900 mb-0.5'>⚖️ Macromolecule Guidance</h3>
                <p className='text-gray-700 bg-white/50 p-2 rounded-lg border border-blue-50 font-medium'>{data.macroTargets}</p>
              </div>
            </div>

            <div>
              <h3 className='font-bold text-blue-900 mb-0.5'>🏃 Active Training Strategy</h3>
              <p className='text-gray-700 bg-white/50 p-2 rounded-lg border border-blue-50 h-full'>{data.exerciseStrategy}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}