import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pins the verification top bar to the viewport on mobile so it does not scroll.
 * Reserves matching space in the document so page content starts below it.
 */
export function FixedFlowChrome({
  children,
  showOnDesktop = false,
}: {
  children: ReactNode;
  showOnDesktop?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const sync = () => setHeight(el.getBoundingClientRect().height);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <>
      <div
        ref={barRef}
        className={[
          "z-20 w-full bg-ims-surface",
          showOnDesktop
            ? "fixed inset-x-0 top-0 print:hidden lg:static lg:inset-auto"
            : "fixed inset-x-0 top-0 print:hidden lg:hidden",
        ].join(" ")}
      >
        {children}
      </div>
      <div
        className={showOnDesktop ? "shrink-0 lg:hidden" : "shrink-0 lg:hidden"}
        style={{ height }}
        aria-hidden
      />
    </>
  );
}
