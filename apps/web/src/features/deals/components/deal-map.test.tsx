// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { DealMap } from "./deal-map"

afterEach(cleanup)

const zoomOf = (container: HTMLElement) =>
  Number(
    container
      .querySelector("img")
      ?.getAttribute("src")
      ?.split("/tile/")[1]
      ?.split("/")[0]
  )

describe("DealMap zoom", () => {
  it("steps the tiles' zoom level within Esri's range, without opening Maps", () => {
    const { container } = render(
      <DealMap lat={53.8155} lng={-1.5609} address="1 Test St" />
    )
    const zoomIn = screen.getByRole("button", { name: "Zoom in" })
    const zoomOut = screen.getByRole("button", { name: "Zoom out" })
    expect(zoomOf(container)).toBe(15)

    fireEvent.click(zoomIn)
    expect(zoomOf(container)).toBe(16)
    expect(zoomIn).toHaveProperty("disabled", true) // no tiles beyond 16

    for (let i = 0; i < 10; i++) fireEvent.click(zoomOut)
    expect(zoomOf(container)).toBe(11)
    expect(zoomOut).toHaveProperty("disabled", true)

    // The buttons aren't inside the Maps link.
    const link = screen.getByRole("link", { name: "Open 1 Test St in Maps" })
    expect(link.contains(zoomIn)).toBe(false)
  })
})
