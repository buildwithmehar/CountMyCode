import type { ScanPhase } from "../shared/types";
export function createProgressGate(
  interval = 80,
  now: () => number = () => performance.now(),
) {
  let previous: ScanPhase | undefined,
    last = -Infinity;
  return (phase: ScanPhase) => {
    const time = now(),
      terminal = phase === "complete" || phase === "error" || phase === "idle";
    if (!terminal && phase === previous && time - last < interval) return false;
    previous = phase;
    last = time;
    return true;
  };
}
