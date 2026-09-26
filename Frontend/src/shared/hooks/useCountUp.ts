import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 600): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!target) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    let rafId: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = target * ease;
      setCount(Number.isInteger(target) ? Math.round(current) : parseFloat(current.toFixed(1)));
      if (progress < 1) {
        rafId = requestAnimationFrame(update);
      }
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return count;
}
