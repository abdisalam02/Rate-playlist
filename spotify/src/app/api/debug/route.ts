import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Get the headers
  const headersList = headers();
  const headerEntries = Array.from(headersList.entries());
  
  // Get the request URL info
  const url = new URL(request.url);
  
  // Get environment variables (safe to expose)
  const publicEnvVars = {
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  
  // Return debug information
  return NextResponse.json({
    success: true,
    message: "Debug information",
    request: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(headerEntries),
    },
    url: {
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      origin: url.origin,
    },
    env: publicEnvVars,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

// Also handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 