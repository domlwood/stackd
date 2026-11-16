import { runInNewContext } from "node:vm"
import { renderToString } from "react-dom/server"

import { Providers } from "./providers"

it.each([
  ["dark", false, "dark"],
  ["light", true, "light"],
  [null, true, "dark"],
  [null, false, "light"],
])(
  "keeps the SSR startup script working (saved %s, system dark %s)",
  (saved, dark, expected) => {
    const html = renderToString(
      <Providers>
        <p>App content</p>
      </Providers>
    )
    const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1]
    expect(script).toBeTruthy()
    const classes = new Set<string>()
    const root = {
      classList: {
        remove: (...names: string[]) =>
          names.forEach((name) => classes.delete(name)),
        add: (name: string) => classes.add(name),
      },
      style: { colorScheme: "" },
    }
    runInNewContext(script!, {
      document: { documentElement: root },
      localStorage: { getItem: () => saved },
      window: { matchMedia: () => ({ matches: dark }) },
    })
    expect([...classes]).toEqual([expected])
    expect(root.style.colorScheme).toBe(expected)
  }
)
