import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the server session using our auth options
    const session = await getServerSession(authOptions);
    
    // Return sanitized session details for debugging
    return NextResponse.json({
      authenticated: !!session,
      userId: session?.user?.id || null,
      userName: session?.user?.name || null,
      hasAccessToken: !!session?.accessToken,
      headers: {
        cookie: request.headers.has('cookie'),
        authorization: request.headers.has('authorization')
      }
    });
    
  } catch (error) {
    console.error('Error in debug-session route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
} 