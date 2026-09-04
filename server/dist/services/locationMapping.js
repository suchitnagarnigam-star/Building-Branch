"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoneForBlock = zoneForBlock;
/**
 * Server-side Block → Zone mapping.
 * Mirrors the frontend locationData so Zone is always derived/validated server-side.
 */
const BLOCK_ZONE_MAP = {
    // Zone A
    "Block 2": "Zone A",
    "Block 3": "Zone A",
    "Block 4": "Zone A",
    "Block 5": "Zone A",
    "Block 6": "Zone A",
    "Block 7": "Zone A",
    "Block 8": "Zone A",
    "Block 9": "Zone A",
    "Block 10": "Zone A",
    "Block 11": "Zone A",
    "Block 12": "Zone A",
    "Block 13": "Zone A",
    "Block 25": "Zone A",
    "Block 32": "Zone A",
    "Block 33": "Zone A",
    // Zone B
    "Block 14": "Zone B",
    "Block 23": "Zone B",
    "Block 24": "Zone B",
    "Block 30": "Zone B",
    "Block 31(1)": "Zone B",
    "Block 31(2)": "Zone B",
    // Zone C
    "Block 15": "Zone C",
    "Block 16": "Zone C",
    "Block 21": "Zone C",
    "Block 22": "Zone C",
    "Block 29": "Zone C",
    "Block 37": "Zone C",
    // Zone D
    "Block 1": "Zone D",
    "Block 17": "Zone D",
    "Block 18": "Zone D",
    "Block 19": "Zone D",
    "Block 20": "Zone D",
    "Block 26": "Zone D",
    "Block 27": "Zone D",
    "Block 28": "Zone D",
    "Block 34": "Zone D",
    "Block 35": "Zone D",
    "Block 36": "Zone D",
};
/** Returns the Zone for a given Block, or null if unrecognised. */
function zoneForBlock(block) {
    return BLOCK_ZONE_MAP[block] ?? null;
}
