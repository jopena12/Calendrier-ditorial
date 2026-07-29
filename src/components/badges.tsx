import { PLATFORM_META, STATUS_META } from "@/lib/platforms";
import type { Platform, PostStatus } from "@/lib/types";

export function PlatformBadge({
  platform,
  size = "sm",
}: {
  platform: Platform;
  size?: "xs" | "sm";
}) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      className={
        size === "xs"
          ? "inline-flex items-center rounded px-1 py-px text-[10px] font-bold text-white"
          : "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
      }
      style={{ backgroundColor: meta.color }}
      title={meta.label}
    >
      {size === "xs" ? meta.short : meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function BrandDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "#6366f1" }}
    />
  );
}
