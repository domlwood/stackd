import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Authenticated pages render per request. No ISR/data-cache storage is required.
const config = defineCloudflareConfig()
// Use the same build path validated locally, without Turbopack's helper ports.
config.buildCommand = "npm run build -- --webpack"

export default config
