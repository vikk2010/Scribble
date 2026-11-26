import Image from "next/image";

type Props = { name: string; url: string | null; size: number; className?: string };

export function Avatar({ name, url, size, className = "" }: Props) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-brand-gradient text-white ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          aria-hidden
          className="flex h-full items-center justify-center font-semibold"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
