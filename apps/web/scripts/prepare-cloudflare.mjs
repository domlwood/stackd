// OpenNext copies local .env files into its output. Deployment must instead use
// Cloudflare runtime bindings, without bundling local admin/seed credentials.
import { readdirSync, unlinkSync, writeFileSync } from "node:fs"

const output = new URL("../.open-next/", import.meta.url)
writeFileSync(
  new URL("cloudflare/next-env.mjs", output),
  "export const production = {};\nexport const development = {};\nexport const test = {};\n"
)

function removeEnvFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory
    )
    if (entry.isDirectory()) removeEnvFiles(path)
    else if (/^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)/.test(entry.name))
      unlinkSync(path)
  }
}
removeEnvFiles(output)
console.log(
  "Cloudflare output prepared; runtime configuration comes from Worker bindings."
)
