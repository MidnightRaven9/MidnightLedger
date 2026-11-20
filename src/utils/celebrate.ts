import { triggerConfetti } from './emojis';

let globalInitialLoad = true;
if (typeof window !== 'undefined') {
  setTimeout(() => {
    globalInitialLoad = false;
  }, 800);
}

export function tryCelebrate(
  _pageKey: string,
  allPaidNow: boolean,
  prevAllPaidValue: boolean,
  isInitialLoad: boolean = globalInitialLoad
): boolean {
  if (isInitialLoad) return allPaidNow; // block pop on page open
  const wasJustCompleted = prevAllPaidValue === false && allPaidNow === true;
  if (wasJustCompleted) {
    triggerConfetti();
  }
  return allPaidNow;
}
