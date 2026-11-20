import React, { useCallback, useEffect, useRef, useState } from 'react';

interface HorizontalScrollerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({
  children,
  className = '',
  onScroll,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [thumb, setThumb] = useState({ width: 100, left: 0, visible: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 2) {
      setThumb((prev) => (prev.visible ? { width: 100, left: 0, visible: false } : prev));
      return;
    }
    const width = Math.max(12, (el.clientWidth / el.scrollWidth) * 100);
    const left = (el.scrollLeft / overflow) * (100 - width);
    setThumb((prev) =>
      prev.visible && prev.width === width && prev.left === left
        ? prev
        : { width, left, visible: true }
    );
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, children]);

  const seek = (clientX: number, track: HTMLElement) => {
    const el = ref.current;
    if (!el) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  };

  return (
    <div className="w-full min-w-0">
      <div
        ref={ref}
        className={className}
        onScroll={(event) => {
          measure();
          onScroll?.(event);
        }}
        {...rest}
      >
        {children}
      </div>

      {thumb.visible && (
        <div
          className="mt-2 h-[3px] rounded-full bg-[var(--border)] cursor-pointer touch-none"
          role="scrollbar"
          aria-label="Scroll sideways"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((thumb.left / (100 - thumb.width || 1)) * 100)}
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            seek(event.clientX, event.currentTarget);
          }}
          onPointerMove={(event) => {
            if (dragging.current) seek(event.clientX, event.currentTarget);
          }}
          onPointerUp={(event) => {
            dragging.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          <div
            className="relative h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
          />
        </div>
      )}
    </div>
  );
};
