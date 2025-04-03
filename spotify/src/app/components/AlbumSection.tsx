'use client';

import React from 'react';
import SectionHeader from './SectionHeader'; // Use relative path
import AlbumCard from './AlbumCard'; // Use relative path

// Define consistent types (can be imported from a shared types file eventually)
interface Album {
  id: string | number;
  name: string; 
  title?: string; 
  images?: { url: string }[];
  cover_medium?: string; 
  artists?: { id?: string | number; name: string }[];
  artist?: { name: string }; 
  release_date?: string; 
}

interface AlbumSectionProps {
  title: string;
  albums: Album[];
  loading: boolean;
  error: string | null;
  viewAllLink?: string;
  viewAllExternalLink?: string;
  itemsToShow?: number; // How many items to show in the preview grid
}

// Skeleton component for loading state
const AlbumCardSkeleton = () => (
    <div className="bg-[#181818] rounded-xl p-4 animate-pulse flex flex-col">
        <div className="aspect-square mb-4 bg-[#333] rounded-lg"></div>
        <div className="space-y-2">
            <div className="h-4 bg-[#333] rounded w-3/4"></div>
            <div className="h-3 bg-[#333] rounded w-1/2"></div>
        </div>
    </div>
);

// Error display component (can be shared, but defined here for simplicity)
const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg text-center">
        <p>Error loading section: {message}</p>
    </div>
);

export default function AlbumSection({
  title,
  albums,
  loading,
  error,
  viewAllLink,
  viewAllExternalLink,
  itemsToShow = 6, // Default to showing 6 items (adjust based on common grid sizes)
}: AlbumSectionProps) {

  const renderContent = () => {
    if (loading) {
      // Adjust grid columns based on typical album display (e.g., more items fit)
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: itemsToShow }).map((_, index) => (
            <AlbumCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (albums.length === 0) {
      return <p className="text-gray-400 text-center py-4">No albums found.</p>;
    }

    return (
      // Adjust grid columns
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {albums.slice(0, itemsToShow).map((album) => (
          <AlbumCard key={album.id} album={album} />
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