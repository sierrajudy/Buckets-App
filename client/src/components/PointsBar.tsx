import { useEffect, useState } from "react";

export function PointsBar({ value, max, color = "bg-green-500" }: { value: number; max: number; color?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? Math.max(4, (value / max) * 100) : 0), 30);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
