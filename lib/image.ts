import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { toLocalISODate } from './dates';

export type PreparedImage = {
  name: string;
  mimeType: string;         // always image/jpeg after compression
  data: string;             // base64 WITHOUT the 'data:image/jpeg;base64,' prefix
  dateGuess: string | null; // YYYY-MM-DD
};

export const MAX_PHOTOS = 6;

async function readPhotoDate(file: File): Promise<string | null> {
  try {
    const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const d = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (d instanceof Date && !isNaN(d.getTime())) return toLocalISODate(d);
  } catch {
    // No readable metadata: fall through.
  }
  return file.lastModified ? toLocalISODate(new Date(file.lastModified)) : null;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const dateGuess = await readPhotoDate(file); // BEFORE compressing

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.25,          // target about 250 KB or less
    maxWidthOrHeight: 1024,   // enough detail for food recognition
    useWebWorker: true,       // keeps the page responsive
    fileType: 'image/jpeg',
    initialQuality: 0.7,
  });

  const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
  return { name: file.name, mimeType: 'image/jpeg', data: dataUrl.split(',')[1], dateGuess };
}

// Earliest photo date wins; otherwise null (the page keeps today).
export function pickDateGuess(images: PreparedImage[]): string | null {
  const dates = images.map((i) => i.dateGuess).filter((d): d is string => !!d).sort();
  return dates[0] ?? null;
}
