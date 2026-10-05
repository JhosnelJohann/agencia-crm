"use client";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-[#e8581a] to-[#f0b040]",
  "from-[#5d8fa8] to-[#16b91a]",
  "from-[#e8581a] to-[#f0b040]",
  "from-[#c96a3d] to-[#9b9490]",
  "from-[#16b91a] to-[#16b91a]",
  "from-[#e8581a] to-[#c96a3d]",
  "from-[#FFBE0B] to-[#e8581a]",
  "from-[#9b9490] to-[#c96a3d]",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function SenderAvatar({
  email,
  name,
  size = 36,
  className,
}: {
  email?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const key = (email || name || "?").toLowerCase().trim();
  const grad = GRADIENTS[hash(key) % GRADIENTS.length];
  const label = name || email || "?";
  const initials = label
    .split(/\s|@|\./)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-xl flex items-center justify-center font-ui font-bold text-white overflow-hidden bg-gradient-to-br shadow-inner",
        grad,
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.35) }}
      title={name || email || ""}
    >
      <span className="drop-shadow-sm">{initials || "?"}</span>
    </div>
  );
}
