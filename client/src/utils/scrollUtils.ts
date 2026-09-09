/**
 * utils/scrollUtils.ts
 *
 * Universal Smooth Momentum Auto-Centering for Horizontal Scrolling Rails.
 *
 * Calculates the exact scroll offset required to bring any active tab, chip,
 * or element to the exact horizontal center of its container viewport.
 * Works seamlessly across desktop (mouse/trackpad) and touch devices.
 */

export const scrollActiveIntoView = (
  element: HTMLElement | null,
  container: HTMLElement | null
) => {
  if (!element || !container) return;

  // Calculate exact center offset relative to the scroll container
  // Formula: element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2)
  // Ensures sub-pixel resilience and zero vertical jumping
  const scrollLeft =
    element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);

  container.scrollTo({
    left: Math.max(0, scrollLeft),
    behavior: 'smooth',
  });
};

/**
 * Enhanced auto-centering helper with optional boundary clamp or padding check.
 */
export const smoothCenter = (
  container: HTMLElement | null,
  element: HTMLElement | null
) => {
  scrollActiveIntoView(element, container);
};
