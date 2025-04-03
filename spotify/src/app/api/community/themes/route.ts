import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Query to get themes
    const query = supabase
      .from('playlist_themes')
      .select('*');
      
    // Add type filter if provided
    if (type) {
      query.eq('type', type);
    }
    
    // Order by type and name
    query.order('type', { ascending: true }).order('name', { ascending: true });
    
    const { data: themes, error } = await query;
    
    if (error) {
      console.error('Error fetching themes:', error);
      
      // Mock themes for development if the table doesn't exist yet
      const mockThemes = [
        { id: 'mood', name: 'Mood', themes: [
          { id: 'happy', name: 'Happy', description: 'Upbeat songs for a good mood', type: 'mood' },
          { id: 'melancholy', name: 'Melancholy', description: 'When you need to feel those feelings', type: 'mood' },
          { id: 'energetic', name: 'Energetic', description: 'High-energy music to boost your spirits', type: 'mood' }
        ]},
        { id: 'time', name: 'Time of Day', themes: [
          { id: 'morning', name: 'Morning Coffee', description: 'Gentle tunes to start your day right', type: 'time' },
          { id: 'night', name: 'Late Night Vibes', description: 'Perfect for those after-hours sessions', type: 'time' }
        ]},
        { id: 'activity', name: 'Activity', themes: [
          { id: 'coding', name: 'Coding Session', description: 'Focus-enhancing tracks for programming', type: 'activity' },
          { id: 'workout', name: 'Workout Intensity', description: 'High-energy tracks to power your exercise', type: 'activity' },
          { id: 'driving', name: 'Highway Cruising', description: 'Music for the open road', type: 'activity' }
        ]}
      ];
      
      return NextResponse.json({ 
        themes: type 
          ? mockThemes.filter(t => t.id === type) 
          : mockThemes 
      });
    }
    
    // Group themes by type for better UI organization
    const groupedThemes = themes.reduce((acc: any[], theme) => {
      const existingCategory = acc.find(cat => cat.id === theme.type);
      
      if (existingCategory) {
        existingCategory.themes.push({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          type: theme.type
        });
      } else {
        acc.push({
          id: theme.type,
          name: formatTypeLabel(theme.type),
          themes: [{
            id: theme.id,
            name: theme.name,
            description: theme.description,
            type: theme.type
          }]
        });
      }
      
      return acc;
    }, []);
    
    return NextResponse.json({ themes: groupedThemes });
    
  } catch (error) {
    console.error('Error in themes GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format type labels for display
function formatTypeLabel(type: string): string {
  switch (type) {
    case 'mood':
      return 'Mood';
    case 'time':
      return 'Time of Day';
    case 'activity':
      return 'Activity';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
} 