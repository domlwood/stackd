import { chromium } from "@playwright/test"
const b = await chromium.launch(); const p = await b.newPage()
p.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)))
await p.goto("http://localhost:3124/sign-in")
await p.getByLabel("Email").fill("alex@test.local"); await p.getByLabel("Password").fill("local-test-pass-1")
await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForTimeout(4000)
console.log("url:", p.url()); console.log((await p.locator("main, body").first().innerText()).slice(0, 400))
await b.close()
