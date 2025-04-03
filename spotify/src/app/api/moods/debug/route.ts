import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get session info
    const session = await getServerSession(authOptions);
    
    // Get environment info
    const envInfo = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      nextPublicVercel: process.env.NEXT_PUBLIC_VERCEL,
    };
    
    return NextResponse.json({
      success: true,
      message: 'Debug information',
      authenticated: !!session,
      sessionInfo: session ? {
        hasUser: !!session.user,
        hasEmail: !!session.user?.email,
        email: session.user?.email?.substring(0, 3) + '***@***' // Partial email for security
      } : null,
      timestamp: new Date().toISOString(),
      envInfo
    });
  } catch (error) {
    console.error('API: Error in debug route:', error);
    return NextResponse.json({
      success: false,
      message: 'Error retrieving debug information',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 