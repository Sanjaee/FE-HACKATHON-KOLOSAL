import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_URL = "https://api.kolosal.ai/v1/chat/completions";
const KOLOSAL_API_KEY =
  "Bearer kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDE0OWZkY2MtMTRhOS00MzYwLWI3YWQtY2IxMzhmODk5MGYwIiwia2V5X2lkIjoiYzBkMDk5ZDYtZTRhYy00NDY2LWExMTUtNjA5NTViNTM3MGI3Iiwia2V5X25hbWUiOiJ0ZXN0dHR0IiwiZW1haWwiOiJhZnJpemFhaG1hZDE4QGdtYWlsLmNvbSIsInJhdGVfbGltaXRfcnBzIjpudWxsLCJtYXhfY3JlZGl0X3VzZSI6MTAsImNyZWF0ZWRfYXQiOjE3NjQ3NzQ1OTMsImV4cGlyZXNfYXQiOjE3OTYzMTA1OTMsImlhdCI6MTc2NDc3NDU5M30.DqjicnHVHodcF40vercq4lyerZAG13n6NS5kGCFhIqs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
};

type ChatResponse = {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    total_tokens: number;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, model = "meta-llama/llama-4-maverick-17b-128e-instruct", max_tokens = 1000 }: ChatRequest = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages are required" });
    }

    const { statusCode, body } = await request(KOLOSAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: KOLOSAL_API_KEY,
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens,
      }),
    });

    const responseData = (await body.json()) as ChatResponse;

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to get chat completion",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

