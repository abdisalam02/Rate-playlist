import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { supabase } from "../lib/supabase";
import type { AuthOptions, Session, Profile, Account, User as NextAuthUser } from "next-auth";

const scopes = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-follow-read",
  "user-follow-modify",
  "playlist-modify-public",
  "playlist-modify-private"
].join(" ");

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log("Refreshing access token");
    
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
      cache: "no-store",
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Error refreshing token:", data);
      throw data;
    }

    console.log("Token successfully refreshed");
    
    const newToken = {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      accessTokenExpires: Date.now() + data.expires_in * 1000,
    };
    
    // Log the new token details (but don't log the actual token values)
    console.log("New token details:", {
      hasAccessToken: !!newToken.accessToken,
      hasRefreshToken: !!newToken.refreshToken,
      expiresAt: new Date(newToken.accessTokenExpires).toISOString()
    });
    
    return newToken;
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: scopes,
          show_dialog: true
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: { token: JWT; account: Account | null; profile?: Profile }): Promise<JWT> {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = Math.floor(Date.now() / 1000 + account.expires_in);
        token.provider = account.provider;
        
        if (account.provider === 'spotify') {
          token.id = profile.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.user.id = token.id;
      return session;
    },
    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }): Promise<boolean> {
      try {
        console.log('signIn Callback: Triggered');
        
        if (!account || !profile || !user?.email) {
           console.error("signIn Callback: Missing account, profile, or user email.");
           return true; // Allow sign-in despite errors
        }

        console.log('User signed in:', user.email);
        
        // Create or update the user in Supabase
        if (user.email) {
          console.log('Creating or updating user in Supabase');
          
          // Check if the user already exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
            
          // If user doesn't exist, create them
          if (!existingUser) {
            console.log('Creating new user in Supabase');
            
            const { data: newUser, error } = await supabase
              .from('users')
              .insert({
                email: user.email,
                spotify_id: profile?.id,
                display_name: user.name || user.email?.split('@')[0] || 'User',
                profile_image: user.image || null,
                last_login: new Date()
              })
              .select('id')
              .single();
              
            if (error) {
              console.error('Error creating user in Supabase:', error);
            } else {
              console.log('User created successfully with ID:', newUser.id);
              
              // Initialize mood tables for the new user
              try {
                // Ensure staple_moods table is set up
                const { error: stapleMoodsError } = await supabase.rpc('init_staple_moods');
                if (stapleMoodsError) {
                  console.error('Failed to initialize staple moods:', stapleMoodsError);
                } else {
                  console.log('Staple moods initialized successfully');
                }
                
                // Ensure user has access to basic moods
                const { error: userMoodsError } = await supabase.rpc('initialize_user_moods', {
                  user_id: newUser.id
                });
                
                if (userMoodsError) {
                  console.error('Failed to initialize user moods:', userMoodsError);
                } else {
                  console.log('User moods initialized successfully');
                }
              } catch (initError) {
                console.error('Error initializing mood tables:', initError);
              }
            }
          } else {
            // Update existing user's last login
            const { error } = await supabase
              .from('users')
              .update({ last_login: new Date() })
              .eq('id', existingUser.id);
              
            if (error) {
              console.error('Error updating user last login:', error);
            } else {
              console.log('User last login updated for ID:', existingUser.id);
            }
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return true; // Allow sign-in despite errors
      }
    },
  },
  pages: {
    signIn: "/login"
  },
  // Ensure JWT strategy
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  debug: process.env.NODE_ENV === "development"
}; 