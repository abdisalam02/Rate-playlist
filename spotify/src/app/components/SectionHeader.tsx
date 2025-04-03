'use client'; // Keep client-side for Link interaction if needed, otherwise remove

import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  viewAllLink?: string;
  viewAllExternalLink?: string; // Optional external link
}

export default function SectionHeader({ title, viewAllLink, viewAllExternalLink }: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-2xl font-bold text-white capitalize">{title}</h2>
      
      {/* Internal Link */} 
      {viewAllLink && (
        <Link 
          href={viewAllLink} 
          className="text-sm font-medium text-[#b3b3b3] hover:text-white hover:underline flex items-center group"
        >
          Show all
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
      
      {/* External Link (only show if no internal link) */} 
      {!viewAllLink && viewAllExternalLink && (
           <a 
            href={viewAllExternalLink} 
            target="_blank" // Open in new tab
            rel="noopener noreferrer" // Security best practice
            className="text-sm font-medium text-[#b3b3b3] hover:text-white hover:underline flex items-center group"
          >
            View on Deezer
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
      )}
    </div>
  );
} 