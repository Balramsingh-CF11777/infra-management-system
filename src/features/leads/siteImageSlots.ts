/** Site Image Capture grid slots (3-column mockup: Interior then Exterior). */
export const SITE_IMAGE_SLOTS = [
  "Interior 1",
  "Interior 2",
  "Interior 3",
  "Exterior 1",
  "Exterior 2",
  "Exterior 3",
  "Exterior 4",
  "Exterior 5",
  "Exterior 6",
  "Exterior 7",
  "Exterior 8",
  "Exterior 9",
] as const;

export type SiteImageSlot = string;

const FIXED_SLOTS = new Set<string>(SITE_IMAGE_SLOTS);

export function isFixedSiteImageSlot(slot: string) {
  return FIXED_SLOTS.has(slot);
}

/** Next free "Additional N" label that is not already on the grid. */
export function nextAdditionalSlot(existing: readonly string[]) {
  const used = new Set(existing);
  let index = 1;
  while (used.has(`Additional ${index}`)) index += 1;
  return `Additional ${index}`;
}

/** Saved photos whose label is not one of the standard Interior / Exterior slots. */
export function extraSiteImageSlots(types: readonly string[]) {
  const seen = new Set<string>();
  const extras: string[] = [];
  for (const type of types) {
    const slot = type.trim();
    if (!slot || FIXED_SLOTS.has(slot) || seen.has(slot)) continue;
    seen.add(slot);
    extras.push(slot);
  }
  return extras;
}
