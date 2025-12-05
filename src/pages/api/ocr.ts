import type { NextApiRequest, NextApiResponse } from "next";
import { request, FormData } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai";
const KOLOSAL_API_KEY =
  "Bearer kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDE0OWZkY2MtMTRhOS00MzYwLWI3YWQtY2IxMzhmODk5MGYwIiwia2V5X2lkIjoiYzBkMDk5ZDYtZTRhYy00NDY2LWExMTUtNjA5NTViNTM3MGI3Iiwia2V5X25hbWUiOiJ0ZXN0dHR0IiwiZW1haWwiOiJhZnJpemFhaG1hZDE4QGdtYWlsLmNvbSIsInJhdGVfbGltaXRfcnBzIjpudWxsLCJtYXhfY3JlZGl0X3VzZSI6MTAsImNyZWF0ZWRfYXQiOjE3NjQ3NzQ1OTMsImV4cGlyZXNfYXQiOjE3OTYzMTA1OTMsImlhdCI6MTc2NDc3NDU5M30.DqjicnHVHodcF40vercq4lyerZAG13n6NS5kGCFhIqs";

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

type OcrRequest = {
  image_data: string; // base64 image
  language?: string;
  auto_fix?: boolean;
  invoice?: boolean;
  custom_schema?: string;
  gcs_access_token?: string;
  gcs_url?: string;
};

// Helper function to safely parse JSON response
async function safeJsonParse(body: { text: () => Promise<string> }) {
  const text = await body.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

// Convert base64 to Buffer
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } | null {
  if (!base64 || typeof base64 !== "string") {
    return null;
  }

  // Handle data URL format: data:image/png;base64,xxxxx
  let cleanBase64 = base64;
  let mimeType = "image/png";

  if (base64.includes(",")) {
    const parts = base64.split(",");
    if (parts.length < 2 || !parts[1]) {
      return null;
    }
    const header = parts[0];
    cleanBase64 = parts[1];

    // Extract mime type from header
    const mimeMatch = header.match(/data:([^;]+);/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
  }

  if (!cleanBase64 || cleanBase64.trim().length === 0) {
    return null;
  }

  try {
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer || buffer.length === 0) {
      return null;
    }
    return { buffer, mimeType };
  } catch (error) {
    console.error("Error converting base64 to buffer:", error);
    return null;
  }
}

// Get file extension from mime type
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/gif": "gif",
  };
  return mimeToExt[mimeType] || "png";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action } = req.query;

  try {
    switch (action) {
      case "extract":
        return handleOcrExtract(req, res);
      case "form":
        return handleOcrForm(req, res);
      default:
        // Default to extract action
        return handleOcrExtract(req, res);
    }
  } catch (error) {
    console.error("OCR API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /ocr - Extract text from image using JSON body
async function handleOcrExtract(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    image_data,
    language = "auto",
    auto_fix = true,
    invoice = false,
    custom_schema,
    gcs_access_token,
    gcs_url,
  }: OcrRequest = req.body;

  if (!image_data && !gcs_url) {
    return res.status(400).json({ error: "Image data or GCS URL is required" });
  }

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      language,
      auto_fix,
      invoice,
    };

    // If GCS URL is provided, use that
    if (gcs_url) {
      requestBody.image_data = gcs_url;
      if (gcs_access_token) {
        requestBody.gcs_access_token = gcs_access_token;
      }
    } else if (image_data) {
      // Use base64 image data directly
      let cleanBase64 = image_data;
      if (image_data.includes(",")) {
        cleanBase64 = image_data.split(",")[1];
      }
      requestBody.image_data = cleanBase64;
    }

    if (custom_schema) {
      requestBody.custom_schema = custom_schema;
    }

    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: KOLOSAL_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to extract text",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("OCR extract error:", error);
    return res.status(500).json({
      error: "Failed to extract text",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /ocr/form - Extract text using multipart/form-data
async function handleOcrForm(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    image_data,
    language = "auto",
    invoice = false,
    custom_schema,
    gcs_access_token,
    gcs_url,
  }: OcrRequest = req.body;

  if (!image_data && !gcs_url) {
    return res.status(400).json({ error: "Image data or GCS URL is required" });
  }

  try {
    const formData = new FormData();

    // Add image file from base64
    if (image_data) {
      const bufferData = base64ToBuffer(image_data);
      if (!bufferData || !bufferData.buffer) {
        return res.status(400).json({
          error: "Invalid image data",
          message: "Failed to decode base64 image data",
        });
      }

      const { buffer, mimeType } = bufferData;
      
      // Validate buffer is not null/empty
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({
          error: "Invalid image data",
          message: "Image buffer is empty",
        });
      }
      
      // Get file extension from mime type
      const ext = getExtensionFromMime(mimeType);
      
      // For undici FormData, we need to create a Blob-like object
      // Convert Buffer to Uint8Array and create Blob
      // Note: In Node.js 18+, Blob is available globally
      let fileBlob: Blob | Buffer;
      
      if (typeof Blob !== "undefined") {
        // Node.js 18+: Use Blob
        const uint8Array = new Uint8Array(buffer);
        fileBlob = new Blob([uint8Array], { type: mimeType });
      } else {
        // Fallback: Use Buffer directly
        fileBlob = buffer;
      }
      
      // Append to FormData
      // undici FormData.append() accepts Blob/Buffer for file uploads
      // Note: undici FormData may not support filename parameter, so we append directly
      formData.append("image", fileBlob);
    }

    // Add other fields
    formData.append("language", language);
    formData.append("invoice", String(invoice));

    if (custom_schema) {
      formData.append("custom_schema", custom_schema);
    }

    if (gcs_access_token) {
      formData.append("gcs_access_token", gcs_access_token);
    }

    if (gcs_url) {
      formData.append("gcs_url", gcs_url);
    }

    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/ocr/form`, {
      method: "POST",
      headers: {
        Authorization: KOLOSAL_API_KEY,
        // Don't set Content-Type - let undici set it with boundary for multipart/form-data
      },
      body: formData,
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      // If form endpoint fails with image validation error, fallback to JSON endpoint
      if (
        responseData?.error === "image_validation_failed" ||
        responseData?.details?.error === "image_validation_failed"
      ) {
        console.log("Form endpoint failed, falling back to JSON endpoint");
        try {
          return handleOcrExtract(req, res);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
      
      return res.status(statusCode).json({
        error: "Failed to process form",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("OCR form error:", error);
    
    // If multipart/form-data fails, try falling back to JSON endpoint
    if (image_data) {
      console.log("Falling back to JSON endpoint due to FormData error");
      try {
        // Fallback to extract endpoint with JSON
        return handleOcrExtract(req, res);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }
    
    return res.status(500).json({
      error: "Failed to process form",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
