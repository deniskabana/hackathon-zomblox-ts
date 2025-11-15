export default function displayReadableTime(time: number) {
  const timeSeconds = time;
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = Math.floor(((timeSeconds / 60 - minutes) * 60) % 60);
  return `${minutes}m ${seconds}s`;
}
