/**
 * Utility functions for the application
 */

import { toast } from 'react-hot-toast';

/**
 * Handles API errors and displays appropriate toast messages
 * @param error The error object
 * @param message Custom error message to display
 */
export function handleApiError(error: any, message: string = 'An error occurred') {
  console.error(message, error);
  
  let errorMessage = message;
  
  // Try to extract more detailed error message if available
  if (error.response) {
    try {
      const errorData = error.response.data;
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  // Show error message to user
  toast.error(errorMessage);
  
  return errorMessage;
}

/**
 * Safely fetch data from API with error handling
 * @param url The API endpoint URL
 * @param options Fetch options
 * @returns Promise with data or null on error
 */
export async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      
      let errorMessage = `Error: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json() as T;
  } catch (error) {
    handleApiError(error, `Failed to fetch data from ${url}`);
    return null;
  }
}

/**
 * Safe fetch specifically for mood operations
 */
export async function fetchMoods() {
  return safeFetch<{ success: boolean; data: any[] }>('/api/moods');
}

/**
 * Add a track to a mood with error handling
 */
export async function addTrackToMood(trackData: {
  mood_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image: string;
}) {
  const loadingToast = toast.loading('Adding track to mood...');
  
  try {
    console.log('Adding track to mood:', trackData);
    
    const response = await fetch(`/api/moods/${trackData.mood_id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_id: trackData.track_id,
        track_name: trackData.track_name,
        artist_name: trackData.artist_name,
        track_image: trackData.track_image
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to add track to mood: ${response.status}`, errorText);
      toast.dismiss(loadingToast);
      
      let errorMessage = 'Failed to add track to mood';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      toast.error(errorMessage);
      return null;
    }
    
    const data = await response.json();
    toast.dismiss(loadingToast);
    toast.success('Track added to mood!');
    
    return data.data;
  } catch (error) {
    console.error('Error adding track to mood:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to add track to mood. Please try again.');
    return null;
  }
}

/**
 * Create a new mood with error handling
 */
export async function createMood(moodData: {
  name: string;
  description: string;
  track_id?: string;
  track_name?: string;
  artist_name?: string;
  track_image?: string;
}) {
  const loadingToast = toast.loading('Creating mood...');
  
  try {
    console.log('Creating mood with data:', {
      name: moodData.name,
      hasTrack: !!moodData.track_id
    });
    
    const response = await fetch('/api/moods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moodData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create mood: ${response.status}`, errorText);
      toast.dismiss(loadingToast);
      
      let errorMessage = 'Failed to create mood';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      toast.error(errorMessage);
      return null;
    }
    
    const data = await response.json();
    toast.dismiss(loadingToast);
    
    const successMessage = moodData.track_id 
      ? 'Mood created with track!' 
      : 'Mood created successfully!';
    
    toast.success(successMessage);
    
    return data.data;
  } catch (error) {
    console.error('Error creating mood:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to create mood. Please try again.');
    return null;
  }
} 