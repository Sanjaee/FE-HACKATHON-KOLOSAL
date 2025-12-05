import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { request } from "undici";
import { api, TokenManager } from "../../../lib/api";
import type { GoogleOAuthRequest, AuthResponse } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://zoom.zacloth.com";

// Helper function to call backend API directly with undici (for server-side)
async function callBackendAPI<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const { statusCode, body: responseBody } = await request(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });

    const text = await responseBody.text();
    let responseData: any;
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = { error: text || "Unknown error" };
    }

    if (statusCode >= 400) {
      const error = new Error(
        responseData.message ||
        responseData.error?.message ||
        `HTTP ${statusCode}: Request failed`
      ) as Error & {
        response?: {
          status: number;
          data: unknown;
        };
      };
      error.response = {
        status: statusCode,
        data: responseData,
      };
      throw error;
    }

    // Unwrap data if response is wrapped in { data: ... }
    if (responseData.data) {
      return responseData.data;
    }

    return responseData;
  } catch (error) {
    console.error(`Backend API Error [${endpoint}]:`, error);
    throw error;
  }
}
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          // If accessToken is provided (from OTP verification), use it directly
          if (credentials?.accessToken) {
            try {
              // Decode JWT token to get user info (no need to call API)
              const tokenParts = credentials.accessToken.split('.');
              if (tokenParts.length !== 3) {
                console.error("Invalid JWT token format");
                return null;
              }

              // Decode JWT payload (base64url) - Node.js environment
              let base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
              // Add padding if needed
              while (base64.length % 4) {
                base64 += '=';
              }

              // Use Buffer if available (Node.js), otherwise use atob (browser)
              let payloadStr: string;
              if (typeof Buffer !== 'undefined') {
                payloadStr = Buffer.from(base64, 'base64').toString();
              } else {
                payloadStr = atob(base64);
              }

              const payload = JSON.parse(payloadStr);

              // Extract user info from JWT payload
              const userId = payload.userId || payload.sub || "";
              const email = payload.email || "";
              const role = payload.role || "member";
              
              // Use email prefix as name (can be enhanced later)
              const userName = email.split("@")[0] || "User";

              return {
                id: userId,
                email: email,
                name: userName,
                image: "",
                accessToken: credentials.accessToken,
                refreshToken: credentials.refreshToken || "",
                isVerified: true, // If token exists, email is verified
                userType: role,
                loginType: "credential",
              };
            } catch (error) {
              console.error("Token validation failed:", error);
              console.error("Error details:", error instanceof Error ? error.message : String(error));
              return null;
            }
          }

          // Regular login with email/password
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Call backend API directly with undici (server-side)
          const authResponse = await callBackendAPI<AuthResponse>(
            "/api/v1/auth/login",
            {
              method: "POST",
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          // Check if email verification is required
          if (authResponse.requires_verification && authResponse.verification_token) {
            // Throw special error to trigger redirect to verification page
            const error = new Error("EMAIL_NOT_VERIFIED") as Error & {
              verification_token?: string;
              user_email?: string;
            };
            error.verification_token = authResponse.verification_token;
            error.user_email = authResponse.user.email;
            throw error;
          }

          // Store tokens in localStorage
          TokenManager.setTokens(
            authResponse.access_token,
            authResponse.refresh_token
          );

          return {
            id: authResponse.user.id,
            email: authResponse.user.email,
            name: authResponse.user.full_name,
            image: authResponse.user.profile_photo || "",
            accessToken: authResponse.access_token,
            refreshToken: authResponse.refresh_token,
            isVerified: authResponse.user.is_verified,
            userType: authResponse.user.user_type,
            loginType: authResponse.user.login_type,
          };
        } catch (error) {
          console.error("Authentication error:", error);

          // Check if it's a specific error from our backend and throw it
          if (error instanceof Error) {
            // Pass through the specific error message from our backend
            // Frontend will catch and display in toast
            throw error;
          }

          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth
      if (account?.provider === "google") {
        try {
          // Call backend API directly with undici (server-side)
          const authResponse = await callBackendAPI<AuthResponse>(
            "/api/v1/auth/google-oauth",
            {
              method: "POST",
              body: JSON.stringify({
                email: user.email!,
                full_name: user.name || user.email!.split("@")[0],
                profile_photo: user.image || "",
                google_id: account.providerAccountId,
              } as GoogleOAuthRequest),
            }
          );

          // Store the tokens in the user object for the JWT callback
          user.accessToken = authResponse.access_token;
          user.refreshToken = authResponse.refresh_token;
          user.isVerified = authResponse.user.is_verified;
          user.userType = authResponse.user.user_type;
          user.loginType = authResponse.user.login_type;
          user.image = authResponse.user.profile_photo || user.image;

          return true;
        } catch (error) {
          console.error("Google OAuth error:", error);

          // Check if it's a specific error from our backend
          if (error instanceof Error) {
            // Map error messages for toast display
            if (error.message.includes("already registered with password") || 
                error.message.includes("already registered with credentials")) {
              throw new Error("Email sudah terdaftar dengan password. Silakan login dengan email dan password.");
            }
            if (error.message.includes("different Google account")) {
              throw new Error("Email sudah terdaftar dengan akun Google yang berbeda.");
            }
            // Re-throw with original message for toast display
            throw error;
          }

          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          sub: user.id,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          isVerified: user.isVerified,
          userType: user.userType,
          loginType: user.loginType,
          image: user.image,
          accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
      }

      // Handle session update trigger (when update() is called)
      if (trigger === "update" && token.accessToken) {
        try {
          // Fetch updated user data from backend
          const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
          const userResponse = await fetch(`${backendUrl}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const updatedUser = userData.data?.user || userData.user;
            if (updatedUser) {
              return {
                ...token,
                image: updatedUser.profile_photo || updatedUser.profilePic || token.image,
                // Update name/username if changed
                name: updatedUser.username || updatedUser.full_name || token.name,
              };
            }
          }
        } catch (error) {
          console.error("Failed to fetch updated user data:", error);
          // Continue with existing token if fetch fails
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      const refreshed = await refreshAccessToken(token);
      
      // Ensure all required JWT fields are present
      return {
        ...token,
        ...refreshed,
        sub: token.sub || "",
      } as typeof token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        // Prioritize token.image over session.user.image
        session.user.image = (token.image as string) || session.user.image || undefined;
        session.user.name = (token.name as string) || session.user.name || "";
        session.user.role = token.userType as string; // Add role alias
        session.user.username = (token.name as string) || session.user.name; // Add username alias
      }
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.isVerified = token.isVerified as boolean;
      session.userType = token.userType as string;
      session.loginType = token.loginType as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

async function refreshAccessToken(token: {
  refreshToken?: string;
  accessTokenExpires?: number;
  [key: string]: unknown;
}) {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    // Call backend API directly with undici (server-side)
    const refreshedTokens = await callBackendAPI<AuthResponse>(
      "/api/v1/auth/refresh-token",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: token.refreshToken }),
      }
    );

    if (!refreshedTokens) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      isVerified: refreshedTokens.user?.is_verified ?? true,
      userType: refreshedTokens.user?.user_type ?? "member",
      loginType: refreshedTokens.user?.login_type ?? "credential",
      image: refreshedTokens.user?.profile_photo || token.image || "",
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth(authOptions);
