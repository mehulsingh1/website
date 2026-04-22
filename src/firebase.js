// ============================================
// Google Sign-In using Google Identity Services (GIS)
// OAuth2 Token Flow — reliable popup-based sign-in
// ============================================

const GOOGLE_CLIENT_ID = '737420969991-8cn0rvkq84seqg1othn38ar5e7dno5jh.apps.googleusercontent.com';

// Load the GIS script once
let gisLoadPromise = null;

function loadGoogleScript() {
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export const signInWithGoogle = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGoogleScript();

      // Use OAuth2 token client — opens a proper Google popup
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid profile email',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }

          // Fetch user info from Google using the access token
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch user info');

            const profile = await res.json();

            resolve({
              displayName: profile.name,
              email: profile.email,
              photoURL: profile.picture,
              uid: profile.sub,
            });
          } catch (fetchErr) {
            reject(fetchErr);
          }
        },
        error_callback: (err) => {
          reject(new Error(err.message || 'Google sign-in was cancelled'));
        },
      });

      // This opens the Google sign-in popup immediately
      tokenClient.requestAccessToken();
    } catch (error) {
      reject(error);
    }
  });
};
