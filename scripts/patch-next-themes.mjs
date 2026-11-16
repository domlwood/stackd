// Temporary next-themes 0.4.6 compatibility fix for React's client script warning.
// Upstream: https://github.com/pacocoursey/next-themes/pull/386
// Preserve the SSR startup script, but do not recreate it on client mounts.
// Remove this patch when upgrading to a release that includes the upstream fix.
import { readFileSync, writeFileSync } from "node:fs"

const packageRoot = new URL("../node_modules/next-themes/", import.meta.url)
const { version } = JSON.parse(
  readFileSync(new URL("package.json", packageRoot), "utf8")
)
if (version !== "0.4.6") {
  throw new Error(
    `Review/remove the next-themes compatibility patch before using ${version}.`
  )
}

const original = "=>{let p=JSON.stringify("
const patched =
  '=>{if(typeof window!=="undefined")return null;let p=JSON.stringify('
for (const name of ["dist/index.js", "dist/index.mjs"]) {
  const path = new URL(name, packageRoot)
  const source = readFileSync(path, "utf8")
  if (source.includes(patched)) continue
  if (source.split(original).length !== 2)
    throw new Error(
      `Unexpected next-themes contents in ${name}; patch aborted.`
    )
  writeFileSync(path, source.replace(original, patched))
}
console.log("Applied next-themes server-only startup script patch.")
