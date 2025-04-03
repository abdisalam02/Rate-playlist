import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function getValidSession(req?: NextRequest) {
  try {
    // Get the server session using auth options
    const session = await getServerSession(authOptions);
    
    // Log session details for debugging
    console.log("Session validation:", {
      authenticated: !!session,
      hasUserId: !!session?.user?.id,
      hasAccessToken: !!session?.accessToken,
      headers: req ? {
        hasCookie: !!req.headers.get('cookie'),
        cookieLength: req.headers.get('cookie')?.length || 0,
      } : 'No request provided'
    });
    
    // Only return the session if it has a user ID
    if (session?.user?.id) {
      return session;
    }
    
    return null;
  } catch (error) {
    console.error("Error validating session:", error);
    return null;
  }
} 