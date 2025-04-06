'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import UserAvatar from '@/app/components/UserAvatar';

// Icons for navigation
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
    </svg>
  );
}

function MoodIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
    </svg>
  );
}

// --- Added Favorites Icon ---
function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z"></path>
    </svg>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeDropdowns = () => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-[#121212]/95 backdrop-blur-sm shadow-md' : 'bg-transparent'} text-white`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex items-center gap-3 md:gap-8">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
              MusicBoxd
            </Link>
            
            {/* Desktop Navigation Links - Added Favorites */}
            <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
              <Link href="/" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <HomeIcon />
                <span>Home</span>
              </Link>
              <Link href="/discover" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <DiscoverIcon />
                <span>Discover</span>
              </Link>
              <Link href="/community" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <CommunityIcon />
                <span>Community</span>
              </Link>
              <Link href="/community/activity" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ActivityIcon />
                <span>Activity</span>
              </Link>
              <Link href="/moods/staple" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MoodIcon />
                <span>Moods</span>
              </Link>
              {/* --- Added Favorites Link --- */}
              {session && (
                <Link href="/favorites" className="flex items-center gap-1.5 hover:text-white transition-colors">
                   <HeartIcon />
                   <span>Favorites</span>
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auth / Profile section */}
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-neutral-700 animate-pulse"></div>
            ) : session ? (
              <div className="relative" ref={profileMenuRef}>
                <div 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <UserAvatar 
                    imageUrl={session.user?.image}
                    username={session.user?.name}
                    sizeClasses="w-8 h-8"
                    textSizeClass="text-sm"
                  />
                  <span className="text-sm hidden lg:block font-medium mr-1">
                    {session.user?.name || 'User'}
                  </span>
                  <svg className="w-4 h-4 opacity-70 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {profileMenuOpen && (
                  <ul className="absolute right-0 z-[1] menu p-2 shadow bg-[#181818] rounded-lg w-52 mt-2 border border-neutral-700 text-sm">
                    <li>
                      <Link 
                        href="/profile" 
                        className="hover:bg-neutral-700 rounded py-2 px-4 block" 
                        onClick={closeDropdowns}
                      >
                        Profile
                      </Link>
                    </li>
                    <div className="divider my-1 h-px bg-neutral-700"></div>
                    <li>
                      <button 
                        onClick={() => {
                          closeDropdowns();
                          signOut();
                        }}
                        className="text-sm text-red-400 hover:bg-neutral-700 rounded w-full text-left py-2 px-4 block"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <button 
                onClick={() => signIn("spotify")}
                className="bg-[#1DB954] text-black font-bold py-1.5 px-4 text-sm rounded-full hover:bg-opacity-80 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Sign In
              </button>
            )}
            
            {/* Mobile dropdown menu - Added Favorites */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-ghost btn-circle hover:bg-neutral-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              
              {mobileMenuOpen && (
                <ul className="absolute right-0 z-[1] shadow bg-[#181818] rounded-lg w-60 mt-2 border border-neutral-700 text-base overflow-hidden">
                  <li>
                    <Link 
                      href="/" 
                      className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                      onClick={closeDropdowns}
                    >
                      <HomeIcon />
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/discover" 
                      className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                      onClick={closeDropdowns}
                    >
                      <DiscoverIcon />
                      Discover
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/community" 
                      className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                      onClick={closeDropdowns}
                    >
                      <CommunityIcon />
                      Community
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/community/activity" 
                      className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                      onClick={closeDropdowns}
                    >
                      <ActivityIcon />
                      Activity
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/moods/staple" 
                      className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                      onClick={closeDropdowns}
                    >
                      <MoodIcon />
                      Moods
                    </Link>
                  </li>
                  
                  {/* --- Added Favorites Link --- */}
                  {session && (
                    <li>
                      <Link 
                        href="/favorites" 
                        className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors flex items-center gap-3" 
                        onClick={closeDropdowns}
                      >
                        <HeartIcon />
                        Favorites
                      </Link>
                    </li>
                  )}

                  {/* --- Profile/Auth Section --- */}
                  {session ? (
                    <>
                      <div className="h-px bg-neutral-700 my-1"></div>
                      <li>
                        <Link 
                          href="/profile" 
                          className="block py-3 px-5 hover:bg-neutral-700 active:bg-neutral-600 transition-colors" 
                          onClick={closeDropdowns}
                        >
                          Profile
                        </Link>
                      </li>
                      <li>
                        <button 
                          onClick={() => {
                            closeDropdowns();
                            signOut();
                          }}
                          className="block py-3 px-5 w-full text-left text-red-400 hover:bg-neutral-700 active:bg-neutral-600 transition-colors"
                        >
                          Sign Out
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-neutral-700 my-1"></div>
                      <li className="p-3">
                         <button 
                           onClick={() => {
                             closeDropdowns();
                             signIn("spotify");
                           }}
                           className="bg-[#1DB954] text-black hover:bg-opacity-80 rounded-full font-medium w-full text-center py-2.5 px-4"
                         >
                           Sign In
                         </button>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 