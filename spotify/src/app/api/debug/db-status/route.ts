import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserId } from '@/lib/session';

/**
 * GET handler for /api/debug/db-status
 * Returns detailed information about database connection and required tables
 */
export async function GET(request: Request) {
  console.log('API: Received request to /api/debug/db-status');
  
  const headersObj = headers();
  const requestUrl = new URL(request.url);
  
  // Check database connection
  const dbStatus = await checkDbConnection();
  
  // Check session
  const session = await getServerSession(authOptions);
  const userId = session ? await getUserId() : null;
  
  // Check required tables
  const requiredTables = ['users', 'staple_moods', 'user_moods', 'mood_tracks'];
  const tableStatuses = {};
  
  if (dbStatus.connected) {
    for (const table of requiredTables) {
      tableStatuses[table] = await checkTableExists(table);
    }
  }
  
  // Compile full status report
  const statusReport = {
    timestamp: new Date().toISOString(),
    request: {
      url: request.url,
      method: request.method,
      path: requestUrl.pathname,
      query: Object.fromEntries(requestUrl.searchParams.entries()),
      headers: {
        host: headersObj.get('host'),
        'user-agent': headersObj.get('user-agent'),
        referer: headersObj.get('referer'),
      }
    },
    environment: {
      node_env: process.env.NODE_ENV,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
      has_supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
      has_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
    },
    database: dbStatus,
    tables: tableStatuses,
    auth: {
      has_session: !!session,
      has_user: !!session?.user,
      user_id: userId || 'Not authenticated',
    }
  };
  
  return NextResponse.json(statusReport, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 