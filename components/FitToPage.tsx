"use client";

import { useLayoutEffect, useRef } from "react";

// Keeps a printed sheet on one A4 page: if the content runs taller than
// maxMm (long address, remarks, …) it is zoomed down just enough to fit,
// and widened to match so it still spans the full page width.
export default function FitToPage({ maxMm, children }: { maxMm: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const limit = (maxMm * 96) / 25.4;
    const fit = () => {
      el.style.zoom = "";
      el.style.width = "";
      const width = el.getBoundingClientRect().width;
      let zoom = 1;
      // Widening the zoomed content lets text reflow shorter, so settle in a few passes.
      for (let i = 0; i < 4; i++) {
        const height = el.getBoundingClientRect().height;
        if (height <= limit) break;
        zoom = Math.floor(zoom * (limit / height) * 1000) / 1000;
        el.style.zoom = String(zoom);
        el.style.width = `${width / zoom}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("beforeprint", fit);
    return () => window.removeEventListener("beforeprint", fit);
  }, [maxMm]);

  return <div ref={ref}>{children}</div>;
}
