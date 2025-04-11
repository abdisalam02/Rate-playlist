import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { supabase } from "../lib/supabase";
import type { AuthOptions, Session as NextAuthSession, Profile, Account, User as NextAuthUser } from "next-auth";

// Define a more specific session type
export interface AppSession extends NextAuthSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id: string; // Supabase UUID (Required if user object exists)
    spotifyId?: string; // Spotify ID
  };
  accessToken?: string;
  error?: string;
}

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
    console.log("Refreshing access token for user:", token.id); 
    
    // Ensure refreshToken exists before proceeding
    if (typeof token.refreshToken !== 'string') {
        console.error('Cannot refresh token: Missing or invalid refreshToken.');
        return { ...token, error: "MissingRefreshTokenError" };
    }
    
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
        refresh_token: token.refreshToken, // Already checked it's a string
      }),
      cache: "no-store",
    });

    const refreshedTokens = await response.json();
    
    if (!response.ok) {
      console.error("Error refreshing token response:", refreshedTokens);
      const errorDetails = refreshedTokens?.error_description || refreshedTokens?.error || JSON.stringify(refreshedTokens);
      token.error = `RefreshAccessTokenError: ${errorDetails}`;
      console.error(`RefreshAccessTokenError: ${errorDetails}`);
      return token; // Return token with error set
    }

    console.log("Token successfully refreshed for user:", token.id);

    // Update the token object with refreshed values
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Keep the same refresh token unless Spotify provides a new one (rare)
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, 
      error: undefined, // Clear any previous error
    };

  } catch (error) {
    console.error("Catch block: Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenCatchError", // Indicate a different type of error
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
      let updatedToken = { ...token }; // Work with a mutable copy

      // Initial sign-in: Store necessary details including Supabase UUID and Name
      if (account && profile) {
        console.log("JWT Callback: Initial Sign-in");
        updatedToken.accessToken = account.access_token;
        updatedToken.refreshToken = account.refresh_token;
        updatedToken.accessTokenExpires = Date.now() + (Number(account.expires_in) ?? 3600) * 1000;
        
        const spotifyId = (profile as any)?.id;
        if (!spotifyId) {
            console.error("JWT Callback: Spotify profile ID missing during initial sign-in.");
            return { ...updatedToken, error: "MissingSpotifyIdError" };
        }
        updatedToken.spotifyId = spotifyId; 
        updatedToken.picture = (profile as any)?.images?.[0]?.url;
        updatedToken.error = undefined; 
        
        // Fetch the corresponding Supabase User ID (UUID) AND display_name
        try {
          console.log(`JWT Callback: Fetching Supabase user for Spotify ID: ${spotifyId}`);
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, display_name') // Select UUID and DB display_name
            .eq('spotify_id', spotifyId)
            .single(); 

          if (dbError || !userData) {
            console.error("JWT Callback: Error fetching Supabase user/name or user not found.", dbError);
            return { ...updatedToken, error: "SupabaseUserFetchError" }; 
          }
          
          console.log(`JWT Callback: Found Supabase User ID: ${userData.id}, Name: ${userData.display_name}`);
          updatedToken.sub = userData.id; // Store Supabase UUID
          updatedToken.name = userData.display_name; // Store Supabase display_name

        } catch (fetchError) {
            console.error("JWT Callback: Catch block - Error fetching Supabase user ID/name", fetchError);
            return { ...updatedToken, error: "SupabaseUserFetchCatchError" };
        }
        
        console.log("JWT Callback: Initial token created.");
        return updatedToken; 
      }

      // Subsequent requests: Check if Supabase UUID (sub) exists - critical for fetching name
      if (!updatedToken.sub) {
         console.error("JWT Callback: Sub (Supabase User ID) missing from token on subsequent request.");
         return { ...updatedToken, error: "MissingSubError" }; // Can't proceed without UUID
      }

      // Check if token is expired
      const isTokenExpired = updatedToken.accessTokenExpires && Date.now() >= updatedToken.accessTokenExpires;

      if (isTokenExpired) {
          console.log("JWT: Token expired, attempting refresh...");
          // Prevent refresh loop if refresh already failed critically or no refresh token
          if (updatedToken.error === "RefreshAccessTokenError" || 
              updatedToken.error === "MissingRefreshTokenError" || 
              updatedToken.error === "SupabaseUserFetchError" || 
              updatedToken.error === "SupabaseUserFetchCatchError" || 
              !updatedToken.refreshToken) {
             console.warn("JWT: Cannot refresh token due to previous critical error or missing refresh token.", { error: updatedToken.error, hasRefreshToken: !!updatedToken.refreshToken });
             return updatedToken; // Return token with the existing critical error
          }
          updatedToken = await refreshAccessToken(updatedToken); // Refresh the access token
          // Check if refresh itself failed
          if (updatedToken.error) {
              console.warn("JWT: Token refresh failed.", updatedToken.error);
              return updatedToken; // Return token with refresh error
          }
          console.log("JWT: Token refresh successful.");
      }
      
      // --- ALWAYS Fetch latest name from DB before returning --- 
      try {
        // Fetch the current display_name using the Supabase UUID (token.sub)
        const { data: nameData, error: nameError } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', updatedToken.sub)
            .single();

        if (nameError) {
            console.error("JWT Callback: Error re-fetching display_name:", nameError);
            // Don't block session, just log error, keep potentially stale name
        } else if (nameData) {
            if (updatedToken.name !== nameData.display_name) {
                console.log(`JWT Callback: Updating token name from '${updatedToken.name}' to '${nameData.display_name}'`);
                updatedToken.name = nameData.display_name; // Update token name
            }
        } else {
             console.warn(`JWT Callback: User ${updatedToken.sub} not found when re-fetching name.`);
        }
      } catch (fetchError) {
        console.error("JWT Callback: Catch block - Error re-fetching display_name", fetchError);
      }
      // --- END Fetch latest name --- 
      
      // Clear non-critical errors if token is otherwise valid
      if (!isTokenExpired && updatedToken.error && updatedToken.error !== "RefreshAccessTokenError" && updatedToken.error !== "MissingRefreshTokenError" && updatedToken.error !== "SupabaseUserFetchError" && updatedToken.error !== "SupabaseUserFetchCatchError" && updatedToken.error !== "MissingSubError") {
          updatedToken.error = undefined;
      }
      
      return updatedToken; // Return current or refreshed token with updated name
    },
    
    async session({ session, token }: { session: NextAuthSession; token: JWT }): Promise<AppSession> {
      // Cast the incoming session to AppSession. 
      // We'll ensure the required fields are populated.
      const appSession: AppSession = session as AppSession;

      appSession.accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
      appSession.error = typeof token.error === 'string' ? token.error : undefined;
      
      // Ensure user object exists and id is assigned if token.sub exists
      if (token.sub) {
        if (!appSession.user) {
           // Initialize user object if it doesn't exist
           appSession.user = { id: token.sub };
        } else {
           // Assign id if user exists but id might be missing (shouldn't happen with required id, but safe)
           appSession.user.id = token.sub;
        }
        
        // Assign other optional properties
        if (token.spotifyId) appSession.user.spotifyId = token.spotifyId as string;
        if (token.name) appSession.user.name = token.name;
        if (token.picture) {
            appSession.user.image = token.picture;
        } else {
            // Explicitly set image to null/undefined if not in token
            appSession.user.image = undefined; 
        } 
      } else {
          console.warn("Session Callback: token.sub (Supabase User ID) is missing! Cannot fully populate session user.");
          // If there's no token.sub, we can't guarantee user.id, 
          // so we might remove the user object or leave it partially populated depending on requirements.
          // For now, let's ensure it's at least potentially undefined if no ID.
          if (appSession.user && !appSession.user.id) { 
              // This state implies an issue, perhaps remove user?
              // Or rely on downstream checks for user.id
              console.error("Session Callback: User object exists but ID is missing after checking token.sub.")
          }
      }
      
      console.log("Session callback final result:", {
        user: appSession.user, 
        expires: appSession.expires, 
        error: appSession.error, 
        accessTokenExists: !!appSession.accessToken 
      });
      
      // Type assertion might be needed if TS still complains, but logic ensures structure
      return appSession as AppSession;
    },

    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }): Promise<boolean> {
        const spotifyId = (profile as any)?.id;
        if (!spotifyId) {
            console.error("signIn Callback: Spotify profile ID is missing.");
            return false; 
        }
        const userEmail = user.email;
        if (!userEmail) {
            console.error("signIn Callback: User email is missing.");
            return false; 
        }

        try {
            const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id')
                .eq('spotify_id', spotifyId)
            .maybeSingle();
            
            if (fetchError) {
                console.error("signIn Callback: Error fetching user from Supabase:", fetchError);
                return false; 
            }

            let dbUserId: string;
          if (!existingUser) {
                 console.log(`signIn Callback: Creating new user for Spotify ID: ${spotifyId}`);
                const displayName = (profile as any)?.display_name || profile?.name || user.name || userEmail.split('@')[0] || 'User';
                const profileImage = (profile as any)?.images?.[0]?.url || profile?.image || user.image || null;
            
                const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                        email: userEmail,
                        spotify_id: spotifyId,
                        display_name: displayName,
                        profile_image: profileImage, 
                        last_login: new Date().toISOString()
              })
              .select('id')
              .single();
                if (insertError) {
                    console.error('signIn Callback: Error creating user in Supabase:', insertError);
                    return false; 
                }
                dbUserId = newUser.id;
                console.log(`signIn Callback: New user created with Supabase ID: ${dbUserId}`);
                try {
                    const { error: initError } = await supabase.rpc('initialize_user_moods', { user_id_input: dbUserId });
                    if (initError) console.error('signIn Callback: Error initializing user moods via RPC:', initError);
                    else console.log(`signIn Callback: Initialized moods for new user ${dbUserId}`);
                } catch (initError) {
                    console.error('signIn Callback: Error calling RPC for mood tables:', initError);
                }
            } else {
                dbUserId = existingUser.id;
                console.log(`signIn Callback: Updating existing user ${dbUserId} for Spotify ID: ${spotifyId}`);
                const displayName = (profile as any)?.display_name || profile?.name || user.name || userEmail.split('@')[0] || 'User';
                const profileImage = (profile as any)?.images?.[0]?.url || profile?.image || user.image || null;
                
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                        last_login: new Date().toISOString(),
                    })
                    .eq('id', dbUserId);
                if (updateError) console.error('signIn Callback: Error updating user last login:', updateError);
            }
        return true;
      } catch (error) {
            console.error('signIn Callback: Uncaught error:', error);
            return false;
      }
    },
  },
  pages: {
    signIn: "/login"
  },
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