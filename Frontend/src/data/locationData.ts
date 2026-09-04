/**
 * Flat Block → Zone mapping.
 * Block is the primary selector; Zone is derived from Block.
 * Ward data is not available as structured data — Ward remains a free-text field.
 */

export interface BlockZoneEntry {
  block: string;
  zone: string;
}

export const locationData: BlockZoneEntry[] = [
  // Zone A
  { block: "Block 2",     zone: "Zone A" },
  { block: "Block 3",     zone: "Zone A" },
  { block: "Block 4",     zone: "Zone A" },
  { block: "Block 5",     zone: "Zone A" },
  { block: "Block 6",     zone: "Zone A" },
  { block: "Block 7",     zone: "Zone A" },
  { block: "Block 8",     zone: "Zone A" },
  { block: "Block 9",     zone: "Zone A" },
  { block: "Block 10",    zone: "Zone A" },
  { block: "Block 11",    zone: "Zone A" },
  { block: "Block 12",    zone: "Zone A" },
  { block: "Block 13",    zone: "Zone A" },
  { block: "Block 25",    zone: "Zone A" },
  { block: "Block 32",    zone: "Zone A" },
  { block: "Block 33",    zone: "Zone A" },

  // Zone B
  { block: "Block 14",    zone: "Zone B" },
  { block: "Block 23",    zone: "Zone B" },
  { block: "Block 24",    zone: "Zone B" },
  { block: "Block 30",    zone: "Zone B" },
  { block: "Block 31(1)", zone: "Zone B" },
  { block: "Block 31(2)", zone: "Zone B" },

  // Zone C
  { block: "Block 15",    zone: "Zone C" },
  { block: "Block 16",    zone: "Zone C" },
  { block: "Block 21",    zone: "Zone C" },
  { block: "Block 22",    zone: "Zone C" },
  { block: "Block 29",    zone: "Zone C" },
  { block: "Block 37",    zone: "Zone C" },

  // Zone D
  { block: "Block 1",     zone: "Zone D" },
  { block: "Block 17",    zone: "Zone D" },
  { block: "Block 18",    zone: "Zone D" },
  { block: "Block 19",    zone: "Zone D" },
  { block: "Block 20",    zone: "Zone D" },
  { block: "Block 26",    zone: "Zone D" },
  { block: "Block 27",    zone: "Zone D" },
  { block: "Block 28",    zone: "Zone D" },
  { block: "Block 34",    zone: "Zone D" },
  { block: "Block 35",    zone: "Zone D" },
  { block: "Block 36",    zone: "Zone D" },
];

/** Derive the Zone for a given Block. Returns empty string if block not found. */
export function zoneForBlock(block: string): string {
  return locationData.find((entry) => entry.block === block)?.zone ?? "";
}
