export function BrandLockup({ className = "" }: { className?: string }) {
  // Light-only site, so one logo. The <picture> wrapper stays because the CSS sizes `.brand-lockup img`.
  return <picture className={`brand-lockup ${className}`}><img src="/eqlshare-lockup-light.svg" alt="eqlShare"/></picture>;
}
