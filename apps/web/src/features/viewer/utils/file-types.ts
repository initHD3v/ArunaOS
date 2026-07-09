export type FileCategory =
  'image' | 'audio' | 'video' | 'text' | 'markdown' | 'pdf' | 'code' | 'unknown';

const typeMap: Record<string, FileCategory> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  ico: 'image',
  avif: 'image',

  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  aac: 'audio',
  flac: 'audio',
  wma: 'audio',
  m4a: 'audio',

  mp4: 'video',
  webm: 'video',
  avi: 'video',
  mov: 'video',
  mkv: 'video',

  txt: 'text',
  text: 'text',
  log: 'text',
  ini: 'text',
  cfg: 'text',

  md: 'markdown',
  mdx: 'markdown',

  pdf: 'pdf',

  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  json: 'code',
  xml: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  py: 'code',
  rs: 'code',
  go: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  h: 'code',
  sql: 'code',
  sh: 'code',
  bash: 'code',
  yaml: 'code',
  yml: 'code',
  toml: 'code',
};

export function getFileCategory(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  return typeMap[ext] ?? 'unknown';
}

export function canOpenNative(filename: string): boolean {
  const cat = getFileCategory(filename);
  return cat !== 'unknown' && cat !== 'pdf' && cat !== 'video';
}
