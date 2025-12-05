import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "undici";
import type {
  RegisterRequest,
  LoginRequest,
  OTPVerifyRequest,
  ResendOTPRequest,
  ResetPasswordRequest,
  VerifyResetPasswordRequest,
  RegisterResponse,
  AuthResponse,
  OTPVerifyResponse,
  ResendOTPResponse,
  ResetPasswordResponse,
  VerifyResetPasswordResponse,
  GoogleOAuthRequest,
} from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://zoom.zacloth.com";

// Helper function to safely parse JSON response
async function safeJsonParse(body: { text: () => Promise<string> }) {
  const text = await body.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unknown error" };
  }
}

// Helper function to make request to backend API
async function makeBackendRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<{ statusCode: number; data: T }> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Get Authorization header from request if available
  const authHeader = options.headers?.Authorization;
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  try {
    const { statusCode, body: responseBody } = await request(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });

    const responseData = await safeJsonParse(responseBody);

    return {
      statusCode,
      data: responseData as T,
    };
  } catch (error) {
    console.error(`Backend API Error [${endpoint}]:`, error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action } = req.query;

  if (!action || typeof action !== "string") {
    return res.status(400).json({ error: "Action parameter is required" });
  }

  try {
    // Get Authorization header from request
    const authHeader = req.headers.authorization;

    switch (action) {
      case "register": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const registerData: RegisterRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<RegisterResponse>(
          "/api/v1/auth/register",
          {
            method: "POST",
            body: JSON.stringify(registerData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "login": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const loginData: LoginRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<AuthResponse>(
          "/api/v1/auth/login",
          {
            method: "POST",
            body: JSON.stringify(loginData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "verify-otp": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const otpData: OTPVerifyRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<OTPVerifyResponse>(
          "/api/v1/auth/verify-otp",
          {
            method: "POST",
            body: JSON.stringify(otpData),
            headers: authHeader ? { Authorization: authHeader } : undefined,
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "resend-otp": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const resendData: ResendOTPRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<ResendOTPResponse>(
          "/api/v1/auth/resend-otp",
          {
            method: "POST",
            body: JSON.stringify(resendData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "google-oauth": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const googleData: GoogleOAuthRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<AuthResponse>(
          "/api/v1/auth/google-oauth",
          {
            method: "POST",
            body: JSON.stringify(googleData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "refresh-token": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { refresh_token } = req.body;
        const { statusCode, data } = await makeBackendRequest<AuthResponse>(
          "/api/v1/auth/refresh-token",
          {
            method: "POST",
            body: JSON.stringify({ refresh_token }),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "forgot-password": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const resetData: ResetPasswordRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<ResetPasswordResponse>(
          "/api/v1/auth/forgot-password",
          {
            method: "POST",
            body: JSON.stringify(resetData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "verify-reset-password": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const verifyData: VerifyResetPasswordRequest = req.body;
        const { statusCode, data } = await makeBackendRequest<VerifyResetPasswordResponse>(
          "/api/v1/auth/verify-reset-password",
          {
            method: "POST",
            body: JSON.stringify(verifyData),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "reset-password": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { token, newPassword } = req.body;
        const { statusCode, data } = await makeBackendRequest<AuthResponse>(
          "/api/v1/auth/reset-password",
          {
            method: "POST",
            body: JSON.stringify({ token, newPassword }),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      case "verify-email": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { token } = req.body;
        const { statusCode, data } = await makeBackendRequest<AuthResponse>(
          "/api/v1/auth/verify-email",
          {
            method: "POST",
            body: JSON.stringify({ token }),
          }
        );

        if (statusCode >= 400) {
          return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error("Auth API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

