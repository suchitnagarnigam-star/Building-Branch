import "dotenv/config";

import type { Complaint } from "../types/complaint";

function getGoogleSheetsWebAppUrl(): string {
  const url = process.env.GOOGLE_SHEETS_WEB_APP_URL;

  if (!url) {
    throw new Error(
      "GOOGLE_SHEETS_WEB_APP_URL is not configured in server/.env",
    );
  }

  return url;
}

export async function appendComplaintToGoogleSheet(
  complaint: Complaint,
): Promise<void> {
  const webAppUrl = getGoogleSheetsWebAppUrl();

  console.log("Sending complaint to Google Sheets...");
  console.log("Google Sheets URL:", webAppUrl);
  console.log("Complaint ID:", complaint.complaintId);

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(complaint),
  });

  const responseText = await response.text();

  console.log("Google Sheets HTTP status:", response.status);
  console.log("Google Sheets response:", responseText);

  if (!response.ok) {
    throw new Error(
      `Google Sheets request failed with status ${response.status}: ${responseText}`,
    );
  }

  let result: {
    success?: boolean;
    message?: string;
  };

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Google Sheets returned a non-JSON response: ${responseText}`,
    );
  }

  if (!result.success) {
    throw new Error(
      result.message ?? "Google Sheets rejected the complaint.",
    );
  }

  console.log(
    `Complaint ${complaint.complaintId} successfully synced to Google Sheets.`,
  );
}