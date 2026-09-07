import type { NextConfig } from 'next';

// GitHub Pages serves a static export from a repo subpath. Gate the export output
// and asset prefix behind an env flag so the default Cloudflare build stays intact.
// assetPrefix (not basePath) is used because vinext's prerenderer skips the index
// route when basePath is set, but prefixes asset URLs correctly with assetPrefix.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const assetPrefix = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = isGithubPages
  ? {
      output: 'export',
      assetPrefix: assetPrefix || undefined,
    }
  : {};

export default nextConfig;
