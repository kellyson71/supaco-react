import { cx } from './ui';

// Capelo (Material Symbols "school") sobre a forma "cookie" do M3 Expressive
const CAP = 'M860-313v-252L508-375q-14 8-29 7.5t-29-8.5L88-574q-8-5-11.5-11.5T73-600q0-8 3.5-14.5T88-626l362-198q7-4 14-6t15-2q8 0 15 2t14 6l396 215q8 4 12 11.5t4 15.5v269q0 13-8.5 21.5T890-283q-13 0-21.5-8.5T860-313ZM450-136 220-262q-14-8-22.5-22t-8.5-31v-174l261 143q14 8 29 8t29-8l261-143v174q0 17-8.5 31T738-262L508-136q-7 4-14 6t-15 2q-8 0-15-2t-14-6Z';

function cookie(lobes = 9, depth = 0.1) {
  const pts: string[] = [];
  for (let i = 0; i <= 360; i += 3) {
    const a = (i * Math.PI) / 180;
    const r = 49 * (1 - depth + depth * (0.5 + 0.5 * Math.cos(lobes * a)));
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const COOKIE = cookie();

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cx('shrink-0', className)} aria-hidden>
      <path d={COOKIE} className="fill-primary" />
      <svg x="20" y="20" width="60" height="60" viewBox="0 -960 960 960"><path d={CAP} className="fill-on-primary" /></svg>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cx('font-semibold tracking-tight', className)}>Supaco</span>;
}

export { CAP, COOKIE };
