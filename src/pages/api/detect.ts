import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai/v1";
const KOLOSAL_API_KEY =
  "Bearer kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDE0OWZkY2MtMTRhOS00MzYwLWI3YWQtY2IxMzhmODk5MGYwIiwia2V5X2lkIjoiYzBkMDk5ZDYtZTRhYy00NDY2LWExMTUtNjA5NTViNTM3MGI3Iiwia2V5X25hbWUiOiJ0ZXN0dHR0IiwiZW1haWwiOiJhZnJpemFhaG1hZDE4QGdtYWlsLmNvbSIsInJhdGVfbGltaXRfcnBzIjpudWxsLCJtYXhfY3JlZGl0X3VzZSI6MTAsImNyZWF0ZWRfYXQiOjE3NjQ3NzQ1OTMsImV4cGlyZXNfYXQiOjE3OTYzMTA1OTMsImlhdCI6MTc2NDc3NDU5M30.DqjicnHVHodcF40vercq4lyerZAG13n6NS5kGCFhIqs";

// Supported file types
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
const SUPPORTED_EXTENSIONS = ["jpeg", "jpg", "png", "webp", "bmp"];

// Helper function to safely parse JSON response
async function safeJsonParse(body: { text: () => Promise<string> }) {
  const text = await body.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

// Validate file type from base64
function validateFileType(base64: string): boolean {
  // Check for data URL prefix
  if (base64.startsWith("data:")) {
    const mimeMatch = base64.match(/^data:([^;]+);/);
    if (mimeMatch) {
      return SUPPORTED_TYPES.includes(mimeMatch[1]);
    }
  }
  return true; // Assume valid if no prefix
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action } = req.query;

  try {
    switch (action) {
      case "cache":
        return handleCache(req, res);
      case "cache-delete":
        return handleCacheDelete(req, res);
      case "health":
        return handleHealth(req, res);
      case "stats":
        return handleStats(req, res);
      case "segment":
        return handleSegmentBase64(req, res);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Detect API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/cache
async function handleCache(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/cache`, {
      method: "GET",
      headers: {
        Authorization: KOLOSAL_API_KEY,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get cache",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Cache error:", error);
    return res.status(500).json({
      error: "Failed to get cache",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// DELETE /v1/cache
async function handleCacheDelete(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/cache`, {
      method: "DELETE",
      headers: {
        Authorization: KOLOSAL_API_KEY,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to delete cache",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Cache delete error:", error);
    return res.status(500).json({
      error: "Failed to delete cache",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/detect/health
async function handleHealth(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/detect/health`,
      {
        method: "GET",
        headers: {
          Authorization: KOLOSAL_API_KEY,
        },
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get health",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Health error:", error);
    return res.status(500).json({
      error: "Failed to get health",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// GET /v1/detect/stats
async function handleStats(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/detect/stats`,
      {
        method: "GET",
        headers: {
          Authorization: KOLOSAL_API_KEY,
        },
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get stats",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({
      error: "Failed to get stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// POST /v1/segment/base64
async function handleSegmentBase64(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    image,
    prompts = [],
    return_annotated = true,
    return_masks = true,
    threshold = 0.5,
  } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Image is required" });
  }

  // Validate file type
  if (!validateFileType(image)) {
    return res.status(400).json({
      error: "Invalid file type",
      detail: "Invalid file type. Supported: jpeg, png, webp, bmp",
    });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/segment/base64`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: KOLOSAL_API_KEY,
        },
        body: JSON.stringify({
          image,
          prompts,
          return_annotated,
          return_masks,
          threshold,
        }),
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to segment image",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Segment error:", error);
    return res.status(500).json({
      error: "Failed to segment image",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Export supported types for frontend validation
export const supportedTypes = SUPPORTED_TYPES;
export const supportedExtensions = SUPPORTED_EXTENSIONS;

