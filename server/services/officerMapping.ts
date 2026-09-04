import { readFile } from "node:fs/promises";
import path from "node:path";

export interface Officer {
  officerId: string;
  name: string;
  mobile: string;
  designation: string;
  zone: string;
  blocks: string[];
}

const getOfficers = async (): Promise<Officer[]> => {
  const filePath = path.join(process.cwd(), "data", "officers.json");
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file) as Officer[];
};

export const findResponsibleOfficer = async (
  zone: string,
  block: string,
): Promise<Officer | null> => {
  const officers = await getOfficers();

  // locationData uses "Zone A" format; officers.json uses bare "A" — normalise both
  const normaliseZone = (z: string) => z.replace(/^zone\s*/i, "").trim().toUpperCase();
  // locationData uses "Block 2" format; officers.json uses bare "2" — normalise both
  const normaliseBlock = (b: string) => b.replace(/^block\s*/i, "").trim();

  const normZone = normaliseZone(zone);
  const normBlock = normaliseBlock(block);

  return (
    officers.find(
      (officer) =>
        normaliseZone(officer.zone) === normZone &&
        officer.blocks.map(normaliseBlock).includes(normBlock),
    ) ?? null
  );
};
