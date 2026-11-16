// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { vi } from "vitest"

import { NewDealFlow } from "./new-deal-flow"

const { push, captureFromLink, createDealManually } = vi.hoisted(() => ({
  push: vi.fn(),
  captureFromLink: vi.fn(),
  createDealManually: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("../actions", () => ({ captureFromLink, createDealManually }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("capture navigation", () => {
  it.each([false, true])(
    "opens the top of the deal after analysing (existing: %s)",
    async (existing) => {
      captureFromLink.mockResolvedValue({
        ok: true,
        dealId: "example-deal",
        existing,
      })
      render(<NewDealFlow products={[]} defaultProductId={null} />)
      fireEvent.change(screen.getByLabelText("Rightmove link"), {
        target: { value: "https://www.rightmove.co.uk/properties/95063484" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Analyse" }))
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith("/deals/example-deal#top")
      )
    }
  )

  it("opens the top of a manually created deal", async () => {
    createDealManually.mockResolvedValue({
      ok: true,
      data: { id: "manual-deal" },
    })
    render(<NewDealFlow products={[]} defaultProductId={null} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Enter details manually instead" })
    )
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "Example Street, Leeds" },
    })
    fireEvent.change(screen.getByLabelText("Postcode"), {
      target: { value: "LS6 1AB" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create deal" }))
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/deals/manual-deal#top")
    )
  })
})
