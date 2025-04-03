// This file has been deprecated
// All real API routes now use actual database connections

export async function GET(request: Request) {
  return new Response(JSON.stringify({
    error: 'Mock API routes have been deprecated. Please use the real API endpoints.',
    status: 410
  }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 