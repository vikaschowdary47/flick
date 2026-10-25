export function BrandLockup({ className = "" }: { className?: string }) {
  return <picture className={`brand-lockup ${className}`}><source media="(prefers-color-scheme: dark)" srcSet="/eqlshare-lockup-dark.svg"/><img src="/eqlshare-lockup-light.svg" alt="eqlShare"/></picture>;
}
