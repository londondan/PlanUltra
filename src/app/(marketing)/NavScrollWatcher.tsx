"use client";

import { useEffect, useRef } from "react";

export function NavScrollWatcher({ navId }: { navId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = document.getElementById(navId);
    if (!nav || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          nav.removeAttribute("data-scrolled");
        } else {
          nav.setAttribute("data-scrolled", "true");
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [navId]);

  return <div ref={sentinelRef} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, pointerEvents: "none" }} />;
}
