import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Keeps keyboard focus inside an open dialog and returns it to the trigger on
 * close. Escape handling stays in useEscapeToClose so existing close paths
 * are not duplicated.
 */
export function useModalFocus(panelRef: RefObject<HTMLElement | null>, isOpen: boolean): void {
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpenRef.current) return;
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !isOpenRef.current || !panel) return;
      const nodes: NodeListOf<HTMLElement> = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const focusable: HTMLElement[] = Array.from(nodes)
        .filter(element => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus();
    };
  }, [panelRef, isOpen]);
}
