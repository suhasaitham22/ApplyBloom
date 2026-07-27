import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Static-assets cache: serves prerendered pages from Workers assets.
// Free-tier friendly (no KV/R2); correct for this app because no route uses ISR.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
