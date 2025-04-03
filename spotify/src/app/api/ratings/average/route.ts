import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('itemType');
    
    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'Item ID and type are required' },
        { status: 400 }
      );
    }
    
    console.log("Fetching average rating for:", itemId, itemType);
    
    // Query the database for average rating
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    
    if (error) {
      console.error("Error fetching ratings:", error);
      return NextResponse.json(
        { error: 'Failed to fetch ratings', details: error.message },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ average: 0, count: 0 });
    }
    
    // Calculate average manually
    const sum = data.reduce((acc, curr) => acc + parseFloat(curr.rating), 0);
    const average = sum / data.length;
    
    const result = { 
      average: parseFloat(average.toFixed(1)), 
      count: data.length 
    };
    
    console.log("Average rating result:", result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in ratings average GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 