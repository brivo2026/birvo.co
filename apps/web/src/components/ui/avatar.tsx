import { cn, initials } from '@/lib/utils';

export function Avatar({ name, src, className, size = 36 }: { name: string; src?: string | null; className?: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-birvo-blue to-birvo-purple text-xs font-semibold text-white',
        className,
      )}
    >
      {initials(name) || '?'}
    </div>
  );
}
