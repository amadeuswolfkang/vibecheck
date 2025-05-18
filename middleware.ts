import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers to protect against common web vulnerabilities
  const headers = {
    // Prevent XSS attacks by controlling resource loading
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts and eval for Next.js
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for Next.js
      "img-src 'self' data: https:", // Allow images from our domain and data URIs
      "connect-src 'self' https://api.openai.com https://oauth2.googleapis.com", // Allow connections to APIs
    ].join('; '),
    
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME-type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Restrict browser features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Enable strict SSL
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };

  // Apply all security headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Only apply middleware to API routes and auth endpoints
export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*',
  ],
}; 