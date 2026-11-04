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

export const SITE_IMAGE_KINDS = ["Interior", "Exterior", "Surroundings", "Other"] as const;

/** Next free "Additional N" label that is not already on the grid. */
export function nextAdditionalSlot(existing: readonly string[]) {
  const used = new Set(existing);
  let index = 1;
  while (used.has(`Additional ${index}`)) index += 1;
  return `Additional ${index}`;
}

/** Build a slot label from a kind and the name the user typed. A blank name takes the next number. */
export function slotLabelFor(kind: string, name: string, existing: readonly string[]) {
  const kindLabel = kind.trim() || "Other";
  const typed = name.trim().replace(/\s+/g, " ");
  if (typed) {
    const alreadyNamed =
      typed.toLowerCase() === kindLabel.toLowerCase() ||
      typed.toLowerCase().startsWith(`${kindLabel.toLowerCase()} `);
    return alreadyNamed ? typed : `${kindLabel} ${typed}`;
  }
  return nextKindSlot(kindLabel, existing, existing).label;
}

/**
 * Prefer an empty Interior/Exterior card already on the grid.
 * If every card of that kind has a photo, create the next number (Interior 9 → Interior 10).
 */
export function nextKindSlot(
  kind: string,
  existingSlots: readonly string[],
  filledSlots: ReadonlySet<string> | readonly string[],
): { label: string; isNew: boolean } {
  const kindLabel = kind.trim() || "Other";
  const filled = filledSlots instanceof Set ? filledSlots : new Set(filledSlots);
  const pattern = new RegExp(`^${escapeRegExp(kindLabel)}\\s+(\\d+)$`, "i");

  const kindSlots = existingSlots
    .filter((slot) => pattern.test(slot))
    .sort((a, b) => {
      const left = Number(a.match(pattern)?.[1] || 0);
      const right = Number(b.match(pattern)?.[1] || 0);
      return left - right;
    });

  for (const slot of kindSlots) {
    if (!filled.has(slot)) return { label: slot, isNew: false };
  }

  let index = 1;
  for (const slot of existingSlots) {
    const match = slot.match(pattern);
    if (match) index = Math.max(index, Number(match[1]) + 1);
  }
  let label = `${kindLabel} ${index}`;
  while (filled.has(label) || existingSlots.includes(label)) {
    index += 1;
    label = `${kindLabel} ${index}`;
  }
  return { label, isNew: true };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function siteImagesFromLead(lead: Record<string, unknown> | null | undefined) {
  const rows =
    (lead?.additional_attachment as Array<{ document_type?: string; document_attachment?: string }> | undefined) || [];
  const byType = new Map(
    rows
      .filter((row) => row.document_type && row.document_attachment)
      .map((row) => [String(row.document_type), String(row.document_attachment)] as const),
  );
  const fixed = SITE_IMAGE_SLOTS.map((slot) => ({ slot, url: byType.get(slot) || "" })).filter((row) => row.url);
  const extra = extraSiteImageSlots([...byType.keys()])
    .map((slot) => ({ slot, url: byType.get(slot) || "" }))
    .filter((row) => row.url);
  return [...fixed, ...extra];
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
