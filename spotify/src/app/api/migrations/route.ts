import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/supabase-admin';

/**
 * GET /api/migrations
 * Runs any necessary database migrations for the application
 * This should only be accessible to admin users
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Running migrations...');
    
    // Check if we need to run migrations
    const runConfirm = req.nextUrl.searchParams.get('confirm') === 'true';
    
    if (!runConfirm) {
      return NextResponse.json({ 
        message: 'Add ?confirm=true to run migrations'
      });
    }
    
    // Run migrations and get results
    const results = await runMigrations();
    
    return NextResponse.json({ 
      message: 'Migrations completed',
      results
    });
  } catch (error: any) {
    console.error('Error running migrations:', error);
    return NextResponse.json(
      { error: 'Failed to run migrations', details: error.message },
      { status: 500 }
    );
  }
} 