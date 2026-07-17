import { cn } from '@/lib/utils';

/**
 * Isotipo de marca BIRVO. Rutas tomadas del archivo de marca original
 * (LOGO BIRVO.svg) — degradado morado→azul (ver packages/ui/src/tokens.ts)
 * con el ave en vuelo en blanco.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1080 1080"
      className={cn('h-9 w-9', className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BIRVO"
    >
      <defs>
        <linearGradient id="birvo-logo-gradient" x1="153.54" y1="540" x2="926.46" y2="540" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect
        fill="url(#birvo-logo-gradient)"
        x="153.54"
        y="153.54"
        width="772.92"
        height="772.92"
        rx="137.59"
        ry="137.59"
      />
      <path
        fill="#fff"
        d="M376.48,364.16c86.24,33.13,168.23,51.99,261.49,59.49-60.83,22.18-124.99,22.25-186.94,20.36-33.51-20.43-57.29-47.84-74.56-79.86Z"
      />
      <path
        fill="#fff"
        d="M787.15,432.65l26.55,30.23c-83.97-10.82-172.89,72.39-205.48,149.62l-147.68,103.35c6.48-44.14,26.52-80.46,51.48-115-40.47-11.36-75.16-27.19-110.27-47.08-50.05-30.86-94.19-66.45-135.45-112.76,105.74,22.95,279.4,40.57,376.07,5.07l70.6-25.92c26.39-9.67,52.12-3.7,74.17,12.48Z"
      />
    </svg>
  );
}
