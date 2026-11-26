import Image from "next/image";
import { TOPICS, TOPIC_KEYS } from "@/lib/topics";

/** A stable colour per name, from the topic palette (white text stays at 4.5:1 or better). */
function gradientFor(name: string): React.CSSProperties {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const t = TOPICS[TOPIC_KEYS[h % TOPIC_KEYS.length]];
  return { backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` };
}

type Props = { name: string; url: string | null; size: number; className?: string };

export function Avatar({ name, url, size, className = "" }: Props) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full text-white ${className}`}
      style={{ width: size, height: size, ...gradientFor(name) }}
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
