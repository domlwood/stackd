// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { vi } from "vitest"

import { CommandPalette } from "./command-palette"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
afterAll(() => vi.unstubAllGlobals())

describe("CommandPalette", () => {
  it("opens from the topbar, accepts a listing link, and navigates to capture", async () => {
    render(<CommandPalette />)
    fireEvent.click(
      screen.getByRole("button", { name: "Paste a Rightmove link or search" })
    )
    const input = await screen.findByRole("combobox")
    const url = "https://www.rightmove.co.uk/properties/95063484"
    fireEvent.change(input, { target: { value: url } })
    fireEvent.click(
      await screen.findByRole("option", { name: "Analyse this listing" })
    )
    expect(push).toHaveBeenCalledWith(
      `/deals/new?url=${encodeURIComponent(url)}`
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it("opens with the keyboard shortcut and filters navigation", async () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const input = await screen.findByRole("combobox")
    fireEvent.change(input, { target: { value: "finance" } })
    fireEvent.click(await screen.findByRole("option", { name: "Finance" }))
    expect(push).toHaveBeenCalledWith("/finance")
  })
})
