import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { supabase } from "../lib/supabase";
import { AuthOptions, Profile, Account, User, Session } from "next-auth";

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
    
    const newToken: JWT = {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      error: undefined,
    };
    
    // Log the new token details (but don't log the actual token values)
    console.log("New token details:", {
      hasAccessToken: !!newToken.accessToken,
      hasRefreshToken: !!newToken.refreshToken,
      expiresAt: newToken.accessTokenExpires ? new Date(newToken.accessTokenExpires).toISOString() : 'N/A'
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
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account && user) {
        console.log('Initial JWT population and DB check');
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
        token.provider = account.provider;
        token.spotifyId = profile?.id;
        token.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
        
        await updateUserProfileInDb(token.spotifyId, token.user);
        return token;
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      if (!token.refreshToken) {
        console.error('No refresh token available to refresh access token.');
        return { ...token, error: "MissingRefreshTokenError" };
      }
      
      console.log('Access token expired or needs refresh, attempting refresh...');
      const refreshedToken = await refreshAccessToken(token);

      if (refreshedToken && !refreshedToken.error && refreshedToken.accessToken && refreshedToken.spotifyId) {
        try {
          console.log(`[JWT Callback] Fetching latest Spotify profile for user ${refreshedToken.spotifyId}`);
          const spotifyProfileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${refreshedToken.accessToken}` }
          });
          
          if (spotifyProfileResponse.ok) {
            const spotifyProfile = await spotifyProfileResponse.json();
            console.log(`[JWT Callback] Spotify Profile fetched successfully:`, JSON.stringify(spotifyProfile, null, 2)); // Log the full profile
            
            // Prioritize larger image if available
            const latestImage = spotifyProfile.images?.[1]?.url || spotifyProfile.images?.[0]?.url || null;
            const latestName = spotifyProfile.display_name || refreshedToken.user?.name;
            const latestEmail = spotifyProfile.email || refreshedToken.user?.email;
            
            console.log(`[JWT Callback] Extracted from Spotify Profile: Name='${latestName}', Image='${latestImage}', Email='${latestEmail}'`);

            // Update token user info
            refreshedToken.user = {
              ...refreshedToken.user,
              id: refreshedToken.spotifyId, // Ensure user ID is Spotify ID
              name: latestName,
              image: latestImage,
              email: latestEmail,
            };
            console.log(`[JWT Callback] Updated token.user:`, refreshedToken.user);

            // Update Supabase DB
            await updateUserProfileInDb(refreshedToken.spotifyId, {
              name: latestName,
              image: latestImage,
              email: latestEmail, 
            });
          } else {
            const errorBody = await spotifyProfileResponse.text();
            console.error(`[JWT Callback] Failed to fetch Spotify profile after token refresh: Status ${spotifyProfileResponse.status}, Body: ${errorBody}`);
          }
        } catch (fetchError) {
          console.error('[JWT Callback] Exception during Spotify profile fetch/update:', fetchError);
        }
      }

      return refreshedToken;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log("[Session Callback] Executing");
      session.user = token.user as User;
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.error = token.error as string | undefined;
      if (token.spotifyId) {
        session.user.id = token.spotifyId as string; // Ensure session user ID is Spotify ID
      }

      // --- Add Profile Update Check --- 
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      // Check if enough time has passed since the last check, or if never checked
      if (token.spotifyId && (!token.lastProfileCheck || now - token.lastProfileCheck > oneHour)) {
        console.log(`[Session Callback] Time for profile check for user: ${token.spotifyId}. Last check: ${token.lastProfileCheck ? new Date(token.lastProfileCheck).toISOString() : 'Never'}`);
        if (token.accessToken) {
          try {
            console.log(`[Session Callback] Fetching latest Spotify profile for ${token.spotifyId}`);
            const spotifyProfileResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${token.accessToken}` }
            });

            if (spotifyProfileResponse.ok) {
              const spotifyProfile = await spotifyProfileResponse.json();
              console.log(`[Session Callback] Spotify Profile fetched:`, JSON.stringify(spotifyProfile, null, 2));
              const latestImage = spotifyProfile.images?.[1]?.url || spotifyProfile.images?.[0]?.url || null;
              const latestName = spotifyProfile.display_name || token.user?.name;
              const latestEmail = spotifyProfile.email || token.user?.email;
              
              console.log(`[Session Callback] Extracted: Name='${latestName}', Image='${latestImage}', Email='${latestEmail}'`);

              // Update the session object immediately if changed
              let changed = false;
              if (latestName !== session.user.name) { session.user.name = latestName; changed = true; }
              if (latestImage !== session.user.image) { session.user.image = latestImage; changed = true; }
              if (latestEmail !== session.user.email) { session.user.email = latestEmail; changed = true; }
              
              if (changed) {
                 console.log(`[Session Callback] Session user data updated.`);
              }

              // Trigger DB update (this function already checks for actual changes)
              await updateUserProfileInDb(token.spotifyId, {
                name: latestName,
                image: latestImage,
                email: latestEmail, 
              });
              
              // Update the token's last check time (IMPORTANT to prevent constant checks)
              // Note: This modification might not persist across requests depending on NextAuth strategy/setup.
              // A more robust solution might store last check time in the database. 
              // For now, we update the token hoping it helps throttle.
              token.lastProfileCheck = now; 
              console.log(`[Session Callback] Updated lastProfileCheck time in token.`);

            } else {
              const errorBody = await spotifyProfileResponse.text();
              console.error(`[Session Callback] Failed to fetch Spotify profile: Status ${spotifyProfileResponse.status}, Body: ${errorBody}`);
            }
          } catch (fetchError) {
            console.error('[Session Callback] Exception during profile fetch/update:', fetchError);
          }
        } else {
          console.warn('[Session Callback] Cannot check profile, no access token in token object.');
        }
      } else if (token.spotifyId) {
        console.log(`[Session Callback] Profile check skipped for ${token.spotifyId}. Last check: ${new Date(token.lastProfileCheck).toISOString()}`);
      }
      // --- End Profile Update Check ---

      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('Running signIn callback');
      try {
        console.log('User signing in:', user.email);
        
        if (user.email) {
          console.log('Checking/Updating user in Supabase during sign-in');
          
          const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('id, spotify_id')
            .eq('email', user.email)
            .maybeSingle();
            
          if (selectError) {
            console.error('Error selecting user during signIn:', selectError);
          }

          const spotifyIdFromProfile = profile && 'id' in profile ? profile.id : null;
          
          if (!existingUser) {
            console.log('Creating new user in Supabase via signIn');
            
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                email: user.email,
                spotify_id: spotifyIdFromProfile,
                display_name: user.name || user.email?.split('@')[0] || 'User',
                profile_image: user.image || null,
                last_login: new Date()
              })
              .select('id')
              .single();
              
            if (insertError) {
              console.error('Error creating user in Supabase via signIn:', insertError);
            } else {
              console.log('User created via signIn with ID:', newUser.id);
              try {
                await supabase.rpc('init_staple_moods').then(({ error }) => { if (error) console.error('Failed init_staple_moods', error); });
                await supabase.rpc('initialize_user_moods', { user_id: newUser.id }).then(({ error }) => { if (error) console.error('Failed initialize_user_moods', error); });
              } catch (initError) {
                console.error('Error initializing moods during signIn:', initError);
              }
            }
          } else {
            console.log('Updating existing user during signIn for ID:', existingUser.id);
            const updates: any = { last_login: new Date() };
            if (spotifyIdFromProfile && existingUser.spotify_id !== spotifyIdFromProfile) {
              updates.spotify_id = spotifyIdFromProfile;
            }

            const { error: updateError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', existingUser.id);
              
            if (updateError) {
              console.error('Error updating user last login/details via signIn:', updateError);
            }
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
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

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: User & {
      spotifyId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    user?: User;
    error?: string;
    provider?: string;
    spotifyId?: string;
    lastProfileCheck?: number; // Add this field to track the last check time
  }
}

async function updateUserProfileInDb(spotifyId: string, userData: { name?: string | null, email?: string | null, image?: string | null }) {
  if (!spotifyId) {
    console.warn('[DB Update] Attempted DB update without spotifyId.');
    return;
  }
  try {
    console.log(`[DB Update] Attempting to update DB for Spotify ID: ${spotifyId}`);
    console.log(`[DB Update] Data to potentially update with:`, userData);
    
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, display_name, profile_image, email')
      .eq('spotify_id', spotifyId)
      .single(); // Use single to expect one row

    // Handle potential errors during select
    if (selectError) {
      if (selectError.code === 'PGRST116') { // "No rows found"
        console.warn(`[DB Update] User with Spotify ID ${spotifyId} not found in DB. Cannot update.`);
        // Optionally, insert the user if they don't exist
        // console.log(`[DB Update] Inserting new user with Spotify ID ${spotifyId}`);
        // await supabase.from('users').insert({...}); 
      } else {
        console.error('[DB Update] Error finding user in DB for update:', selectError);
      }
      return; // Stop execution if user not found or other select error
    }
    
    console.log(`[DB Update] Found existing user in DB:`, existingUser);

    const updates: Record<string, any> = {};
    if (userData.name && userData.name !== existingUser.display_name) {
      console.log(`[DB Update] Name change detected: '${existingUser.display_name}' -> '${userData.name}'`);
      updates.display_name = userData.name;
    }
    // Explicitly check for null vs. URL difference for image
    if (userData.image !== existingUser.profile_image) { 
      console.log(`[DB Update] Image change detected: '${existingUser.profile_image}' -> '${userData.image}'`);
      updates.profile_image = userData.image;
    }
    if (userData.email && userData.email !== existingUser.email) {
      console.log(`[DB Update] Email change detected: '${existingUser.email}' -> '${userData.email}'`);
      updates.email = userData.email;
    }

    if (Object.keys(updates).length > 0) {
      updates.last_login = new Date(); // Also update last login time
      console.log(`[DB Update] Preparing to update user ${existingUser.id} in DB with:`, updates);
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('[DB Update] Error updating user profile in DB:', updateError);
      } else {
        console.log(`[DB Update] Successfully updated user ${existingUser.id} in DB.`);
      }
    } else {
      console.log(`[DB Update] No profile changes detected for user ${existingUser.id}. Skipping DB update.`);
      // Optionally update last_login even if no other changes
      // const { error: updateLoginError } = await supabase.from('users').update({ last_login: new Date() }).eq('id', existingUser.id);
      // if (updateLoginError) console.error('[DB Update] Error updating last_login:', updateLoginError);
    }

  } catch (dbError) {
    console.error('[DB Update] Exception during DB profile update:', dbError);
  }
} 