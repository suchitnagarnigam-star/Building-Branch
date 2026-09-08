import { Mistral } from "@mistralai/mistralai";
import { readFile } from "node:fs/promises";
import { openAsBlob } from "node:fs";
import path from "node:path";

const apiKey = process.env.MISTRAL_API_KEY;

if (!apiKey) {
  throw new Error("MISTRAL_API_KEY is not configured.");
}

const mistral = new Mistral({
  apiKey,
});

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
    return processImageWithOCR(
      sourcePath,
      IMAGE_MIME_TYPES[extension],
    );
  }

  if (extension === ".pdf") {
    return processPdfWithOCR(sourcePath);
  }

  throw new Error(
    `Unsupported OCR file type: ${extension}`,
  );
}

async function processImageWithOCR(
  filePath: string,
  mimeType: string,
): Promise<OCRResult> {
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

async function processPdfWithOCR(
  filePath: string,
): Promise<OCRResult> {
  const uploadedFile = await mistral.files.upload({
    file: await openAsBlob(filePath),
    purpose: "ocr",
  });

  try {
    //get temp signed URL for the uploaded file
    const signedUrl = await mistral.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    //process pdf with OCR using the signed URL
    const response = await mistral.ocr.process({
      model: "mistral-ocr-latest",

      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
    });

    //combine all pages
    const text = response.pages
      .map((page) => page.markdown ?? "")
      .join("\n\n")
      .trim();

    return {
      text,
      pages: response.pages.length,
    };
  } finally {
    //delete the temporary file from Mistral
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
