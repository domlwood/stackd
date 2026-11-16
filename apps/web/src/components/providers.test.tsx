// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { useTheme } from "next-themes"
import { vi } from "vitest"

import { Providers } from "./providers"

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      Toggle theme
    </button>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ""
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it("mounts and remounts without client script tags, preserving theme switching", async () => {
  const errors = vi.spyOn(console, "error")
  const first = render(
    <Providers>
      <ThemeSwitch />
    </Providers>
  )
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
  expect(document.querySelector("script")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }))
  await waitFor(() => expect(document.documentElement).toHaveClass("light"))
  expect(localStorage.getItem("theme")).toBe("light")
  first.unmount()
  render(
    <Providers>
      <ThemeSwitch />
    </Providers>
  )
  await waitFor(() => expect(document.documentElement).toHaveClass("light"))
  expect(document.querySelector("script")).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})

it("hydrates server markup without a script warning or hydration mismatch", async () => {
  const errors = vi.spyOn(console, "error")
  const recoverable = vi.fn()
  const browserWindow = window
  let html: string
  // next-themes caches its environment at import time. A saved explicit theme
  // keeps this same-module SSR simulation from consulting the browser's media query.
  localStorage.setItem("theme", "light")
  vi.stubGlobal("window", undefined)
  try {
    html = renderToString(
      <Providers>
        <ThemeSwitch />
      </Providers>
    )
  } finally {
    vi.stubGlobal("window", browserWindow)
  }
  expect(html).toContain("<script")
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(async () => {
      root = hydrateRoot(
        container,
        <Providers>
          <ThemeSwitch />
        </Providers>,
        {
          onRecoverableError: recoverable,
        }
      )
    })
    expect(
      screen.getByRole("button", { name: "Toggle theme" })
    ).toBeInTheDocument()
    expect(recoverable).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
  } finally {
    await act(async () => root?.unmount())
    container.remove()
  }
})
