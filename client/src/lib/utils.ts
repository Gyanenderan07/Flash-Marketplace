import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { scrollActiveIntoView } from "@/utils/scrollUtils";

export { scrollActiveIntoView };

/**
 * Smooth momentum auto-centering for horizontal scroll rails.
 * Re-delegated to scrollActiveIntoView for 100% production consistency.
 */
export function smoothCenter(container: HTMLElement | null, element: HTMLElement | null) {
  scrollActiveIntoView(element, container);
}
