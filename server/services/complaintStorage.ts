import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { Complaint } from "../types/complaint.js";

const getComplaintsFilePath = () =>
  path.join(process.cwd(), "data", "complaints.json");

export const getComplaints = async (): Promise<Complaint[]> => {
  const filePath = getComplaintsFilePath();
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file) as Complaint[];
};

export const generateComplaintId = async (): Promise<string> => {
  const complaints = await getComplaints();
  const nextNumber = complaints.length + 1;
  return `MCL-BB-${String(nextNumber).padStart(4, "0")}`;
};

export const saveComplaint = async (complaint: Complaint): Promise<void> => {
  // Ensure uploads/ directory exists
  await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

  const complaints = await getComplaints();
  complaints.push(complaint);

  await writeFile(
    getComplaintsFilePath(),
    JSON.stringify(complaints, null, 2),
    "utf-8",
  );
};
