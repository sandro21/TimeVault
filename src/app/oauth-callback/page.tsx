"use client";

import { useEffect } from "react";

/**
 * OAuth callback page
 * Google redirects here after authentication
 * This page extracts the token from the URL and sends it back to the parent window
 */
export default function OAuthCallback() {
  useEffect(() => {
    // Parse the hash fragment (Google OAuth returns tokens in the hash)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const scope = params.get('scope');
    const tokenType = params.get('token_type');
    const error = params.get('error');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage(
        {
          type: 'GOOGLE_AUTH_ERROR',
          error: error,
        },
        window.location.origin
      );
      return;
    }

    if (accessToken && expiresIn && scope && tokenType) {
      // Send token to parent window
      window.opener?.postMessage(
        {
          type: 'GOOGLE_AUTH_SUCCESS',
          token: {
            access_token: accessToken,
            expires_in: parseInt(expiresIn, 10),
            scope: scope,
            token_type: tokenType,
          },
        },
        window.location.origin
      );
    } else {
      window.opener?.postMessage(
        {
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Invalid response from Google',
        },
        window.location.origin
      );
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authorization Successful</h1>
        <p className="text-gray-600">You can close this window now.</p>
      </div>
    </div>
  );
}

