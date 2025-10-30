export function removePathLastSegment({
  path,
  removeCount = 1,
}: {
  path: string;
  removeCount?: number;
}): string {
  if (!path) {
    return path;
  }
  const trimmed = path.trim();
  const hasPrefix = /^m\//i.test(trimmed);
  const segments = hasPrefix ? trimmed.slice(2).split('/') : trimmed.split('/');
  const kept = segments.slice(0, Math.max(segments.length - removeCount, 0));
  const normalized = kept.join('/');
  return hasPrefix ? `m/${normalized}` : normalized;
}

export function getShortXfp({ xfp }: { xfp: string }): string {
  if (!xfp) {
    return '';
  }
  const sanitized = xfp.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  const padded = sanitized.padStart(8, '0');
  return padded.slice(-8).toLowerCase();
}
