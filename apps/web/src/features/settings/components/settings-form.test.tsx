// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { vi } from "vitest"

import { DEFAULT_SETTINGS } from "../schemas"
import { SettingsForm } from "./settings-form"

const { updateSettings } = vi.hoisted(() => ({ updateSettings: vi.fn() }))
vi.mock("../actions", () => ({ updateSettings }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SettingsForm", () => {
  it("only enables Save once something changes, then saves the whole settings", async () => {
    updateSettings.mockResolvedValue({ ok: true })
    render(<SettingsForm initial={DEFAULT_SETTINGS} />)
    const save = screen.getByRole("button", { name: "Save settings" })
    expect(save).toHaveProperty("disabled", true)

    const profit = screen.getByLabelText("Minimum profit")
    fireEvent.change(profit, { target: { value: "25000" } })
    fireEvent.blur(profit)
    expect(save).toHaveProperty("disabled", false)

    fireEvent.click(save)
    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1))
    const sent = updateSettings.mock.calls[0]?.[0]
    expect(sent.buyBox.minFlipProfitPence).toBe(2_500_000)
    // Untouched sections go back unchanged.
    expect(sent.defaults).toEqual(DEFAULT_SETTINGS.defaults)
    await waitFor(() =>
      expect(screen.getByText("All changes saved")).toBeTruthy()
    )
  })

  it("won't save an empty number field", async () => {
    render(<SettingsForm initial={DEFAULT_SETTINGS} />)
    const legal = screen.getByLabelText("Legal fees")
    fireEvent.change(legal, { target: { value: "" } })
    fireEvent.blur(legal)
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }))
    await waitFor(() => expect(legal.getAttribute("aria-invalid")).toBe("true"))
    expect(updateSettings).not.toHaveBeenCalled()
  })
})
