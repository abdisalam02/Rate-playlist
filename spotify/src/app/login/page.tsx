'use client';

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Login() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const error = searchParams?.get("error");
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSpotifyLogin = async () => {
    setLoginInProgress(true);
    await signIn("spotify", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#4caf50]">
        MusicBoxd
      </Link>
      
      <div className="bg-[#181818] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Welcome Back</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-4 text-sm">
            {error === "OAuthSignin" && "Error starting the sign in process."}
            {error === "OAuthCallback" && "Error during the sign in process."}
            {error === "OAuthAccountNotLinked" && "This email is already associated with another account."}
            {error === "Callback" && "Error during the OAuth callback."}
            {!["OAuthSignin", "OAuthCallback", "OAuthAccountNotLinked", "Callback"].includes(error) && 
              "An unexpected error occurred. Please try again."}
          </div>
        )}
        
        <button
          onClick={handleSpotifyLogin}
          disabled={loginInProgress}
          className={`w-full bg-[#1DB954] text-black font-bold py-3 px-4 rounded-full flex items-center justify-center ${
            loginInProgress ? "opacity-70 cursor-not-allowed" : "hover:scale-105"
          } transition-all`}
        >
          {loginInProgress ? (
            <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          )}
          Continue with Spotify
        </button>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-[#1DB954] text-sm hover:underline focus:outline-none"
          >
            Having trouble logging in?
          </button>
          
          {showHelp && (
            <div className="mt-3 text-sm text-gray-300 bg-[#222] p-3 rounded-md">
              <p className="mb-2"><strong>Using Google-connected Spotify:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Click "Continue with Spotify" above</li>
                <li>On the Spotify login page, click "Continue with Google"</li>
                <li>If you don't have a Spotify account yet, you'll need to create one</li>
              </ol>
              <p className="mt-2 text-xs text-gray-400">
                Note: We can only use authentication methods provided by Spotify.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>By continuing, you agree to MusicBoxd's Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
} 