import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { readFile } from "node:fs/promises";
import { openAsBlob } from "node:fs";
import path from "node:path";
import { recognize } from "tesseract.js";
const pdfParse = require("pdf-parse");

const apiKey = process.env.MISTRAL_API_KEY;
const mistral = apiKey ? new Mistral({ apiKey }) : null;

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export interface OCRResult {
  text: string;
  pages: number;
}

export async function processFileWithOCR(
  filePath: string,
): Promise<OCRResult> {
  const sourcePath = path.resolve(filePath);
  const extension = path.extname(sourcePath).toLowerCase();

  if (IMAGE_MIME_TYPES[extension]) {
    if (mistral) {
      try {
        return await processImageWithMistralOCR(
          sourcePath,
          IMAGE_MIME_TYPES[extension],
        );
      } catch (mistralErr: any) {
        console.warn(
          `[OCR] Mistral OCR failed (${mistralErr?.message || mistralErr}). Falling back to local Tesseract OCR...`,
        );
      }
    }
    return processImageWithTesseractOCR(sourcePath);
  }

  if (extension === ".pdf") {
    if (mistral) {
      try {
        return await processPdfWithMistralOCR(sourcePath);
      } catch (mistralErr: any) {
        console.warn(
          `[OCR] Mistral PDF OCR failed (${mistralErr?.message || mistralErr}). Falling back to local PDF parser...`,
        );
      }
    }
    return processPdfWithFallback(sourcePath);
  }

  throw new Error(`Unsupported OCR file type: ${extension}`);
}

async function processImageWithTesseractOCR(
  filePath: string,
): Promise<OCRResult> {
  console.log(`[OCR] Running local Tesseract OCR on ${path.basename(filePath)}...`);
  const { data } = await recognize(filePath, "eng+hin");
  const text = (data.text || "").trim();
  return {
    text,
    pages: 1,
  };
}

async function processPdfWithFallback(
  filePath: string,
): Promise<OCRResult> {
  console.log(`[OCR] Running local PDF text extraction on ${path.basename(filePath)}...`);
  const fileBuffer = await readFile(filePath);
  const parsed = await pdfParse(fileBuffer);
  const text = (parsed.text || "").trim();
  return {
    text,
    pages: parsed.numpages || 1,
  };
}

async function processImageWithMistralOCR(
  filePath: string,
  mimeType: string,
): Promise<OCRResult> {
  if (!mistral) throw new Error("MISTRAL_API_KEY is not configured.");
  const fileBuffer = await readFile(filePath);
  const base64File = fileBuffer.toString("base64");

  const response = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      imageUrl: `data:${mimeType};base64,${base64File}`,
    },
  });

  const text = response.pages
    .map((page) => page.markdown ?? "")
    .join("\n\n")
    .trim();

  return {
    text,
    pages: response.pages.length,
  };
}

async function processPdfWithMistralOCR(
  filePath: string,
): Promise<OCRResult> {
  if (!mistral) throw new Error("MISTRAL_API_KEY is not configured.");
  const uploadedFile = await mistral.files.upload({
    file: await openAsBlob(filePath),
    purpose: "ocr",
  });

  try {
    const signedUrl = await mistral.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    const response = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
    });

    const text = response.pages
      .map((page) => page.markdown ?? "")
      .join("\n\n")
      .trim();

    return {
      text,
      pages: response.pages.length,
    };
  } finally {
    try {
      await mistral.files.delete({
        fileId: uploadedFile.id,
      });
    } catch (error) {
      console.warn(
        `unable to delete temporary Mistral file ${uploadedFile.id}`,
        error,
      );
    }
  }
}
