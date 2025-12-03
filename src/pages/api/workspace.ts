import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";

const KOLOSAL_API_BASE = "https://api.kolosal.ai/v1/workspaces";
const KOLOSAL_API_KEY =
  "Bearer kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDE0OWZkY2MtMTRhOS00MzYwLWI3YWQtY2IxMzhmODk5MGYwIiwia2V5X2lkIjoiYzBkMDk5ZDYtZTRhYy00NDY2LWExMTUtNjA5NTViNTM3MGI3Iiwia2V5X25hbWUiOiJ0ZXN0dHR0IiwiZW1haWwiOiJhZnJpemFhaG1hZDE4QGdtYWlsLmNvbSIsInJhdGVfbGltaXRfcnBzIjpudWxsLCJtYXhfY3JlZGl0X3VzZSI6MTAsImNyZWF0ZWRfYXQiOjE3NjQ3NzQ1OTMsImV4cGlyZXNfYXQiOjE3OTYzMTA1OTMsImlhdCI6MTc2NDc3NDU5M30.DqjicnHVHodcF40vercq4lyerZAG13n6NS5kGCFhIqs";

type WorkspaceSettings = {
  agent_timeout_seconds?: number;
  allowed_file_types?: string[];
  auto_save?: boolean;
  custom_config?: Record<string, unknown>;
  max_file_size_mb?: number;
  python_environment?: string | null;
  shared_resources?: boolean;
};

type CreateWorkspaceRequest = {
  name: string;
  description?: string | null;
  workspace_type?: string;
  settings?: WorkspaceSettings;
  github_repo?: {
    repo_url: string;
    branch?: string | null;
    oauth_token?: string | null;
  };
};

type UpdateWorkspaceRequest = {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  workspace_type?: string;
  settings?: WorkspaceSettings;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action, workspace_id } = req.query;

  try {
    switch (action) {
      case "list":
        return handleList(req, res);
      case "create":
        return handleCreate(req, res);
      case "stats":
        return handleStats(req, res);
      case "get":
        return handleGet(req, res, workspace_id as string);
      case "delete":
        return handleDelete(req, res, workspace_id as string);
      case "update":
        return handleUpdate(req, res, workspace_id as string);
      case "status":
        return handleStatus(req, res, workspace_id as string);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Workspace API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(KOLOSAL_API_BASE, {
      method: "GET",
      headers: {
        Authorization: KOLOSAL_API_KEY,
      },
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to list workspaces",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("List error:", error);
    return res.status(500).json({
      error: "Failed to list workspaces",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data: CreateWorkspaceRequest = req.body;

  if (!data.name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const { statusCode, body } = await request(KOLOSAL_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: KOLOSAL_API_KEY,
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description || null,
        workspace_type: data.workspace_type || "personal",
        settings: data.settings || {},
      }),
    });

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200 && statusCode !== 201) {
      return res.status(statusCode).json({
        error: "Failed to create workspace",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Create error:", error);
    return res.status(500).json({
      error: "Failed to create workspace",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleStats(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { statusCode, body } = await request(`${KOLOSAL_API_BASE}/stats`, {
      method: "GET",
      headers: {
        Authorization: KOLOSAL_API_KEY,
      },
    });

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

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: string
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID is required" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/${workspaceId}`,
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
        error: "Failed to get workspace",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Get error:", error);
    return res.status(500).json({
      error: "Failed to get workspace",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: string
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID is required" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/${workspaceId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: KOLOSAL_API_KEY,
        },
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to delete workspace",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      error: "Failed to delete workspace",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: string
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID is required" });
  }

  const data: UpdateWorkspaceRequest = req.body;

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/${workspaceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: KOLOSAL_API_KEY,
        },
        body: JSON.stringify(data),
      }
    );

    const responseData = await safeJsonParse(body);

    if (statusCode !== 200) {
      return res.status(statusCode).json({
        error: "Failed to update workspace",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({
      error: "Failed to update workspace",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleStatus(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: string
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID is required" });
  }

  try {
    const { statusCode, body } = await request(
      `${KOLOSAL_API_BASE}/${workspaceId}/status`,
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
        error: "Failed to get workspace status",
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Status error:", error);
    return res.status(500).json({
      error: "Failed to get workspace status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
