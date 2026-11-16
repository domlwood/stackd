import { tileCoords } from "./deal-map"

describe("tileCoords (Web Mercator)", () => {
  it("puts the origin at the centre of the world tile", () => {
    expect(tileCoords(0, 0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })

  it("spans the antimeridian edge to edge", () => {
    expect(tileCoords(0, -180, 1).x).toBe(0)
    expect(tileCoords(0, 180, 1).x).toBe(2)
  })

  it("matches the OpenStreetMap tile for central London at zoom 16", () => {
    const { x, y } = tileCoords(51.5074, -0.1278, 16)
    expect(Math.floor(x)).toBe(32744)
    expect(Math.floor(y)).toBe(21792)
  })
})
