'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userImage, setUserImage] = useState('/default-avatar.png');
  const [userName, setUserName] = useState('');
  
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

  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || 'User');
      if (session.user.image) {
        setUserImage(session.user.image);
      }
    }
  }, [session]);

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-[#121212]/95 backdrop-blur-sm shadow-md' : 'bg-transparent'} text-white`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex items-center gap-3 md:gap-8">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
              MusicBoxd
            </Link>
            
            {/* Desktop Navigation Links - Removed Playlists */}
            <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/discover" className="hover:text-white transition-colors">
                Discover
              </Link>
              <Link href="/community" className="hover:text-white transition-colors">
                Community
              </Link>
              <Link href="/community/activity" className="hover:text-white transition-colors">
                Activity
              </Link>
              <Link href="/moods/staple" className="hover:text-white transition-colors">
                Moods
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auth / Profile section */}
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-neutral-700 animate-pulse"></div>
            ) : session ? (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-neutral-800 transition-colors">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-700">
                    <Image 
                      src={userImage}
                      alt="Profile" 
                      fill
                      sizes="32px"
                      className="object-cover"
                      onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                    />
                  </div>
                  <span className="text-sm hidden lg:block font-medium mr-1">{userName}</span>
                  <svg className="w-4 h-4 opacity-70 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-[#181818] rounded-box w-52 mt-2 border border-neutral-700 text-sm">
                  <li>
                    <Link href="/profile" className="hover:bg-neutral-700 rounded">Profile</Link>
                  </li>
                  <li>
                    <Link href="/search" className="hover:bg-neutral-700 rounded">Search</Link>
                  </li>
                  <div className="divider my-1 h-px bg-neutral-700"></div>
                  <li>
                    <button 
                      onClick={() => signOut()}
                      className="text-sm text-red-400 hover:bg-neutral-700 rounded w-full text-left"
                    >
                      Sign Out
                    </button>
                  </li>
                </ul>
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
            
            {/* Mobile dropdown menu using DaisyUI - Removed extra profile info & Playlists */}
            <div className="dropdown dropdown-end md:hidden">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle hover:bg-neutral-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-[#181818] rounded-box w-52 mt-2 border border-neutral-700 text-sm">
                <li><Link href="/" className="hover:bg-neutral-700 rounded">Home</Link></li>
                <li><Link href="/discover" className="hover:bg-neutral-700 rounded">Discover</Link></li>
                <li><Link href="/community" className="hover:bg-neutral-700 rounded">Community</Link></li>
                <li><Link href="/community/activity" className="hover:bg-neutral-700 rounded">Activity</Link></li>
                <li><Link href="/moods/staple" className="hover:bg-neutral-700 rounded">Moods</Link></li>
                
                {session ? (
                  <>
                    <div className="divider my-1 h-px bg-neutral-700"></div>
                    <li><Link href="/profile" className="hover:bg-neutral-700 rounded">Profile</Link></li>
                    <li><Link href="/search" className="hover:bg-neutral-700 rounded">Search</Link></li>
                    <li>
                      <button 
                        onClick={() => signOut()}
                        className="text-sm text-red-400 hover:bg-neutral-700 rounded w-full text-left"
                      >
                        Sign Out
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <div className="divider my-1 h-px bg-neutral-700"></div>
                    <li>
                       <button 
                         onClick={() => signIn("spotify")} 
                         className="bg-[#1DB954] text-black hover:bg-opacity-80 rounded font-medium w-full text-center py-1.5"
                        >
                          Sign In
                       </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 