/** Blok za učitavanje (u boji ruba). Koristi se u <Suspense fallback>. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-rub/60 ${className}`} />;
}
