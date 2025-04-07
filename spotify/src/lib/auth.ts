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
      // Initial sign-in: Store necessary details
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + (Number(account.expires_in) ?? 3600) * 1000;
        // Use type assertion for Spotify-specific ID
        token.id = (profile as any)?.id; 
        token.name = profile.name; 
        token.picture = profile.image; 
        token.error = undefined; 
        return token; 
      }

      // Subsequent requests: Check if token is valid
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        // console.log("JWT: Token still valid.");
         // Ensure no lingering error prevents usage if token is valid
         if (token.error && token.error !== "RefreshAccessTokenError" && token.error !== "MissingRefreshTokenError" && token.error !== "RefreshAccessTokenCatchError") {
             token.error = undefined;
         }
        return token; // Return current token if not expired
      }
      
      // Token expired or needs refresh
      console.log("JWT: Token expired or needs refresh, attempting...");
      // Prevent refresh loop if refresh already failed critically or no refresh token
      if (token.error === "RefreshAccessTokenError" || token.error === "MissingRefreshTokenError" || !token.refreshToken) {
         console.warn("JWT: Cannot refresh token due to previous critical error or missing refresh token.", { error: token.error, hasRefreshToken: !!token.refreshToken });
         return token; // Return token with the existing critical error
      }

      // Attempt to refresh the token
      return refreshAccessToken(token);
    },
    
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      // Pass required data from token to session
      session.accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
      session.error = typeof token.error === 'string' ? token.error : undefined;
      
      // Ensure session.user exists and assign properties safely
      if (session.user) {
        if (token.id) session.user.id = String(token.id); // Spotify ID
        if (token.name) session.user.name = token.name;
        if (token.picture) session.user.image = token.picture;
      }
      
      // DO NOT expose refreshToken to client
      // session.refreshToken = token.refreshToken; 

      // console.log("Session callback result:", session);
      return session;
    },

    // Keep your existing signIn logic (assuming it works for Supabase upsert)
    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }): Promise<boolean> {
        // Use type assertion for Spotify-specific ID
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
            // console.log('signIn Callback: Triggered for', userEmail);
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
                // console.log('signIn Callback: Creating new user');
                const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    email: userEmail,
                    spotify_id: spotifyId,
                    display_name: profile?.name || user.name || userEmail.split('@')[0] || 'User',
                    profile_image: profile?.image || user.image || null,
                    last_login: new Date().toISOString()
                })
                .select('id')
                .single();
                if (insertError) {
                    console.error('signIn Callback: Error creating user in Supabase:', insertError);
                    return false; 
                }
                dbUserId = newUser.id;
                try {
                    const { error: initError } = await supabase.rpc('initialize_user_moods', { user_id_input: dbUserId });
                    if (initError) console.error('signIn Callback: Error initializing user moods via RPC:', initError);
                } catch (initError) {
                    console.error('signIn Callback: Error calling RPC for mood tables:', initError);
                }
            } else {
                // console.log('signIn Callback: Updating existing user', existingUser.id);
                dbUserId = existingUser.id;
                const { error: updateError } = await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
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