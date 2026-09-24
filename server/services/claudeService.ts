import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not configured.");
}

const anthropic = new Anthropic({
  apiKey,
});

export interface ExtractedComplaint {
  citizenName: string;
  phoneNumber: string;
  block: string;
  zone: string;
  ward: string;
  address: string;
  title: string;
  description: string;
}

const complaintSchema = {
  type: "object",
  properties: {
    citizenName: {
      type: "string",
      description:
        "Name of the complainant, resident, sender, or clearly identified person raising the complaint. Return empty string if unavailable.",
    },

    phoneNumber: {
      type: "string",
      description:
        "Phone/mobile number explicitly present in the source. Return empty string if unavailable.",
    },

    block: {
      type: "string",
      description:
        "Block number/name explicitly mentioned in the source. Return empty string if unavailable. Do not guess.",
    },

    zone: {
      type: "string",
      description:
        "Zone explicitly mentioned in the source, if any. Do not infer or calculate the zone. Return empty string if not explicitly stated.",
    },

    ward: {
      type: "string",
      description:
        "Ward explicitly mentioned in the source, if any. Do not guess. Return empty string if unavailable.",
    },

    address: {
      type: "string",
      description:
        "Complaint location/address described in the source. Translate into English. Return empty string if unavailable.",
    },

    title: {
      type: "string",
      description:
        "Short English title describing the main complaint.",
    },

    description: {
      type: "string",
      description:
        "Clear English description of the complaint, preserving the important facts from the source. Do not add facts that are not present.",
    },
  },

  required: [
    "citizenName",
    "phoneNumber",
    "block",
    "zone",
    "ward",
    "address",
    "title",
    "description",
  ],

  additionalProperties: false,
} as const;

export async function extractComplaintFromOCR(
  combinedOcr: string,
  sourceType: "news" | "email" | "other",
): Promise<ExtractedComplaint> {
  if (!combinedOcr.trim()) {
    throw new Error("OCR text is empty.");
  }

  const sourceDescription =
    sourceType === "news"
      ? "a news article or newspaper clipping"
      : sourceType === "email"
        ? "an email or email screenshot"
        : "an external complaint letter or document";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,

    system: `
You are an information extraction assistant for the Municipal Corporation Ludhiana Building Branch complaint system.

Your task is to convert OCR text from ${sourceDescription} into structured complaint information.

IMPORTANT RULES:

1. Translate Punjabi, Hindi, or other non-English content into clear English.
2. Preserve the actual meaning and important facts from the source.
3. Never invent a name, phone number, address, block, ward, zone, date, or other fact.
4. If a field is not available, return an empty string.
5. Extract the person who is actually raising/reporting the complaint when identifiable.
6. For news articles, distinguish the person raising the complaint from reporters, journalists, publication names, or other people mentioned in the article.
7. For emails, use the sender as the complainant when the email clearly represents that person's complaint.
8. For formal letters, use the person signing the complaint as the complainant.
9. Translate the complaint title and description into English.
10. Keep the description factual and concise but do not remove important complaint details.
11. Extract the Block only when it is explicitly mentioned or clearly stated in the source.
12. Do NOT calculate or infer Zone from Block. Zone should only be returned when explicitly written in the source.
13. Do NOT guess the Ward.
14. Do not return explanations outside the requested JSON structure.

The final result will be reviewed by a human operator before registration.
`,

    messages: [
      {
        role: "user",
        content: `
Here is the OCR text extracted from the source document:

===== BEGIN OCR =====

${combinedOcr}

===== END OCR =====

Extract the complaint information according to the rules.
Return all fields in English.
`,
      },
    ],

    output_config: {
      format: {
        type: "json_schema",
        schema: complaintSchema,
      },
    },
  });

  const textBlock = response.content.find(
    (block) => block.type === "text",
  );

  if (!textBlock || textBlock.type !== "text") {
    throw new Error(
      "Claude did not return a structured text response.",
    );
  }

  return JSON.parse(textBlock.text) as ExtractedComplaint;
}