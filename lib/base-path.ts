// Deployment-aware base path for PDFMiniFly.
//
// GitHub Pages project site (https://pdfly-source.github.io/pdfly-app/)
// is built with NEXT_PUBLIC_BASE_PATH=/pdfly-app so all app paths resolve
// under the project sub-path.
//
// Local development, and any root deployment (e.g. a future custom domain
// such as https://example.com/), use the default root path ('').
//
// This must stay a build-time (NEXT_PUBLIC_*) variable: the app is statically
// exported, so the value is inlined into the generated bundle at build time.
// next.config.ts reads the same variable for the Next.js `basePath`.

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prefix a root-relative path (must start with '/') with the deployment
 * base path. Returns the path unchanged when deployed at the root.
 */
export function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  if (!path.startsWith('/')) return path;
  return `${BASE_PATH}${path}`;
}
