/* eslint-disable @next/next/no-img-element */
// LEGO set pictures come straight from Rebrickable's image server. We use a
// plain <img> (not next/image) so Vercel doesn't re-process thousands of
// images, which would eat into the free plan's image limits.
export function RemoteImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 text-3xl ${className ?? ""}`}>
        🧱
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-contain ${className ?? ""}`} />;
}
