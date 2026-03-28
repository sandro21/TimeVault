import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow cross-origin requests from devices on the same network
  // Include both network interfaces that might be used
  allowedDevOrigins: [
    '172.22.0.1',      // Docker/WSL network interface
    '192.168.1.134',   // Local network IP
  ],
};

export default nextConfig;

