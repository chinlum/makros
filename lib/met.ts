export type MetEntry = { key: string; label: string; met: number };

export const MET_TABLE: MetEntry[] = [
  { key: 'walking_moderate', label: 'Walking, moderate (about 5 km/h)', met: 3.5 },
  { key: 'walking_brisk', label: 'Walking, brisk (about 5.5 km/h)', met: 4.3 },
  { key: 'walking_power', label: 'Power walking (about 6.5 km/h)', met: 5.0 },
  { key: 'hiking', label: 'Hiking, cross-country', met: 6.0 },
  { key: 'jogging', label: 'Jogging, general', met: 7.0 },
  { key: 'running_8kmh', label: 'Running, 8 km/h', met: 8.3 },
  { key: 'running_10kmh', label: 'Running, 10 km/h', met: 9.8 },
  { key: 'running_12kmh', label: 'Running, 12 km/h', met: 11.5 },
  { key: 'cycling_leisure', label: 'Cycling, leisure (under 16 km/h)', met: 4.0 },
  { key: 'cycling_moderate', label: 'Cycling, moderate (20-22 km/h)', met: 8.0 },
  { key: 'cycling_vigorous', label: 'Cycling, vigorous (over 25 km/h)', met: 10.0 },
  { key: 'swimming_easy', label: 'Swimming, easy', met: 6.0 },
  { key: 'swimming_laps', label: 'Swimming laps, moderate', met: 7.0 },
  { key: 'weights_general', label: 'Weight training, general', met: 3.5 },
  { key: 'weights_vigorous', label: 'Weight training, vigorous', met: 6.0 },
  { key: 'hiit_circuit', label: 'HIIT / circuit training', met: 8.0 },
  { key: 'yoga', label: 'Yoga, hatha', met: 2.5 },
  { key: 'pilates', label: 'Pilates', met: 3.0 },
  { key: 'badminton', label: 'Badminton, recreational', met: 4.5 },
  { key: 'basketball', label: 'Basketball, game', met: 6.5 },
  { key: 'football', label: 'Football / soccer, casual', met: 7.0 },
  { key: 'tennis', label: 'Tennis', met: 7.3 },
  { key: 'table_tennis', label: 'Table tennis', met: 4.0 },
  { key: 'elliptical', label: 'Elliptical trainer', met: 5.0 },
  { key: 'rowing_machine', label: 'Rowing machine, moderate', met: 4.8 },
  { key: 'jump_rope', label: 'Jump rope', met: 11.8 },
  { key: 'dancing', label: 'Dancing, general', met: 5.0 },
  { key: 'martial_arts', label: 'Martial arts (karate, judo, kickboxing)', met: 10.3 },
];

export const findMet = (key: string) => MET_TABLE.find((e) => e.key === key);
