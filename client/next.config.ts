import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        const backendBaseUrl = process.env.API_URL || "http://localhost:5000";
        return {
            // beforeFiles runs BEFORE Next.js checks its own app/ directory.
            // This is required so that /api/* requests are forwarded to the
            // backend server instead of being intercepted by Next.js (which
            // would 404 since there are no app/api/ route handlers).
            beforeFiles: [
                {
                    source: "/api/:path*",
                    destination: `${backendBaseUrl}/api/:path*`,
                },
            ],
        };
    },
};

export default nextConfig;