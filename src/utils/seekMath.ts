export const positionFromTouch = (x: number, barWidth: number, duration: number): number => {
  if (!(barWidth > 0) || !(duration > 0)) return 0;
  const ratio = Math.min(1, Math.max(0, x / barWidth));
  return ratio * duration;
};

export const formatClock = (seconds: number): string => {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const ss = secs.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
};
