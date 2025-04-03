'use client';

import React from 'react';
import SectionHeader from './SectionHeader'; // Use relative path
import TrackCard from './TrackCard'; // Use relative path

// Define consistent types (can be imported from a shared types file eventually)
interface Track {
  id: string | number;
  name: string;
  title?: string; 
  artists?: { name: string }[];
  artist?: { name: string }; 
  contributors?: { name: string }[]; 
  album?: { 
    name?: string;
    title?: string; 
    images?: { url: string }[]; 
    cover_medium?: string; 
  };
  duration_ms?: number; 
  duration?: number; 
  preview?: string; 
}

interface TrackSectionProps {
  title: string;
  tracks: Track[];
  loading: boolean;
  error: string | null;
  onPlayTrack?: (track: Track) => void; // Optional playback handler
  viewAllLink?: string;
  viewAllExternalLink?: string;
  itemsToShow?: number; // How many items to show in the preview grid
}

// Skeleton component for loading state
const TrackCardSkeleton = () => (
    <div className="bg-[#181818] rounded-lg p-3 animate-pulse flex items-center gap-3">
        <div className="w-12 h-12 bg-[#333] rounded flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#333] rounded w-3/4"></div>
            <div className="h-3 bg-[#333] rounded w-1/2"></div>
        </div>
        <div className="h-3 bg-[#333] rounded w-8"></div>
    </div>
);

// Error display component
const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg text-center">
        <p>Error loading section: {message}</p>
    </div>
);

export default function TrackSection({
  title,
  tracks,
  loading,
  error,
  onPlayTrack,
  viewAllLink,
  viewAllExternalLink,
  itemsToShow = 6, // Default to showing 6 items
}: TrackSectionProps) {

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: itemsToShow }).map((_, index) => (
            <TrackCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (tracks.length === 0) {
      return <p className="text-gray-400 text-center py-4">No tracks found.</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.slice(0, itemsToShow).map((track) => (
          <TrackCard key={track.id} track={track} onPlay={onPlayTrack} />
        ))}
      </div>
    );
  };

  return (
    <section className="mb-12">
      <SectionHeader title={title} viewAllLink={viewAllLink} viewAllExternalLink={viewAllExternalLink} />
      {renderContent()}
    </section>
  );
} 