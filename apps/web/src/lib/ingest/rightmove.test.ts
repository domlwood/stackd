import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { assertAllowedUrl, fetchText, IngestError } from "./http"
import {
  createRightmoveProvider,
  mapPropertyType,
  mapTenure,
  parseListedDate,
  parsePricePence,
  parseRightmoveHtml,
  parseRightmoveUrl,
  RIGHTMOVE_HOSTS,
} from "./rightmove"

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8")
const URL_1 =
  "https://www.rightmove.co.uk/properties/999999991#/?channel=RES_BUY"

describe("parseRightmoveUrl", () => {
  it.each([
    ["https://www.rightmove.co.uk/properties/157594775", "157594775"],
    [
      "https://www.rightmove.co.uk/properties/157594775#/?channel=RES_BUY",
      "157594775",
    ],
    ["https://rightmove.co.uk/properties/157594775?utm=x", "157594775"],
    [
      "https://www.rightmove.co.uk/property-for-sale/property-71234567.html",
      "71234567",
    ],
  ])("%s → %s", (url, id) => {
    expect(parseRightmoveUrl(url)?.propertyId).toBe(id)
    expect(parseRightmoveUrl(url)?.canonicalUrl).toBe(
      `https://www.rightmove.co.uk/properties/${id}`
    )
  })
  it.each([
    "https://www.zoopla.co.uk/for-sale/details/123456",
    "https://evilrightmove.co.uk/properties/123456",
    "not a url",
    "https://www.rightmove.co.uk/property-for-sale/Leeds.html",
  ])("rejects %s", (url) => {
    expect(parseRightmoveUrl(url)).toBeNull()
  })
})

describe("field helpers", () => {
  it("parses prices", () => {
    expect(parsePricePence("£210,000")).toBe(21_000_000)
    expect(parsePricePence("Offers over £1.2m")).toBe(120_000_000)
    expect(parsePricePence("POA")).toBeNull()
  })
  it("maps property types and tenure", () => {
    expect(mapPropertyType("End of Terrace")).toBe("terraced")
    expect(mapPropertyType("Semi-Detached")).toBe("semi_detached")
    expect(mapPropertyType("Detached")).toBe("detached")
    expect(mapPropertyType("Apartment")).toBe("flat")
    expect(mapTenure("SHARE_OF_FREEHOLD")).toBe("share_of_freehold")
    expect(mapTenure("LEASEHOLD")).toBe("leasehold")
  })
  it("parses the listed date", () => {
    expect(parseListedDate("Reduced on 01/10/2026")).toBe("2026-10-01")
  })
})

describe("parseRightmoveHtml (synthetic page model)", () => {
  const result = parseRightmoveHtml(
    fixture("rightmove-synthetic-model.html"),
    URL_1
  )

  it("reads every field from the embedded model with high confidence", () => {
    expect(result.status).toBe("ok")
    expect(result.providerRef).toBe("999999991")
    expect(result.url).toBe("https://www.rightmove.co.uk/properties/999999991")
    const f = result.fields
    expect(f.addressLine?.value).toBe("Elm Grove, Sheffield, S7")
    expect(f.postcode?.value).toBe("S7 1CD")
    expect(f.beds).toMatchObject({ value: 3, confidence: "high" })
    expect(f.baths?.value).toBe(1)
    expect(f.propertyType?.value).toBe("semi_detached")
    expect(f.tenure?.value).toBe("freehold")
    expect(f.floorAreaSqm?.value).toBe(95)
    expect(f.keyFeatures?.value).toHaveLength(3)
    expect(f.photos?.value).toEqual([
      "https://media.rightmove.co.uk/example/1.jpeg",
      "https://media.rightmove.co.uk/example/2.jpeg",
    ])
    expect(f.agent?.value).toBe("Example Homes, Sheffield")
    expect(f.listedAt?.value).toBe("2026-11-03")
    expect(f.lat?.value).toBe(53.36)
  })

  it("marks a qualified price (offers over) as medium confidence", () => {
    expect(result.fields.askingPricePence).toMatchObject({
      value: 21_000_000,
      confidence: "medium",
    })
    expect(result.fields.priceQualifier?.value).toBe("Offers in Excess of")
  })

  it("strips HTML from the description, coping with braces and quotes inside strings", () => {
    expect(result.fields.description?.value).toBe(
      'A probate sale.\nDated throughout with a "good" garden {and} parking.'
    )
  })
})

describe("parseRightmoveHtml (fallbacks)", () => {
  it("falls back to Open Graph tags with medium confidence, and text hints with low", () => {
    const r = parseRightmoveHtml(
      fixture("rightmove-synthetic-meta-only.html"),
      "https://www.rightmove.co.uk/properties/999999992"
    )
    expect(r.status).toBe("ok")
    expect(r.fields.addressLine).toMatchObject({
      value: "Harbour Street, Hull, HU1",
      confidence: "medium",
    })
    expect(r.fields.askingPricePence?.value).toBe(8_500_000)
    expect(r.fields.outcode?.value).toBe("HU1")
    expect(r.fields.propertyType?.value).toBe("flat")
    expect(r.fields.tenure).toMatchObject({
      value: "leasehold",
      confidence: "low",
    })
    expect(r.fields.floorAreaSqm).toMatchObject({
      value: 62,
      confidence: "low",
    })
  })

  it("fails gracefully on a page with nothing usable", () => {
    const r = parseRightmoveHtml(
      "<html><body>Access denied</body></html>",
      URL_1
    )
    expect(r.status).toBe("failed")
    expect(r.message).toMatch(/Enter the details manually/)
  })
})

const realFixture = join(__dirname, "__fixtures__", "rightmove-real-1.html")
describe.runIf(existsSync(realFixture))(
  "parseRightmoveHtml (real saved page)",
  () => {
    it("reads the essentials", () => {
      const r = parseRightmoveHtml(
        readFileSync(realFixture, "utf8"),
        "https://www.rightmove.co.uk/properties/1"
      )
      expect(r.status).not.toBe("failed")
      expect(r.fields.addressLine?.value).toBeTruthy()
      expect(r.fields.askingPricePence?.value).toBeGreaterThan(0)
    })
  }
)

describe("http guard", () => {
  it("only allows https on allowed hosts", () => {
    expect(() =>
      assertAllowedUrl("http://www.rightmove.co.uk/x", RIGHTMOVE_HOSTS)
    ).toThrow(IngestError)
    expect(() =>
      assertAllowedUrl("https://169.254.169.254/latest", RIGHTMOVE_HOSTS)
    ).toThrow(/isn't supported/)
    expect(
      assertAllowedUrl(
        "https://www.rightmove.co.uk/properties/1",
        RIGHTMOVE_HOSTS
      ).hostname
    ).toBe("www.rightmove.co.uk")
  })

  it("rejects redirects off the allowed hosts", async () => {
    const fake = (async () => ({
      ...new Response("x"),
      url: "https://evil.example/",
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => "x",
    })) as unknown as typeof fetch
    await expect(
      fetchText("https://www.rightmove.co.uk/properties/1", {
        allowedHosts: RIGHTMOVE_HOSTS,
        fetchImpl: fake,
        retries: 0,
      })
    ).rejects.toThrow(/isn't supported/)
  })

  it("retries 5xx then succeeds", async () => {
    let calls = 0
    const fake = (async () => {
      calls += 1
      return calls === 1
        ? new Response("err", { status: 503 })
        : new Response("ok", { status: 200 })
    }) as unknown as typeof fetch
    await expect(
      fetchText("https://www.rightmove.co.uk/properties/1", {
        allowedHosts: RIGHTMOVE_HOSTS,
        fetchImpl: fake,
        retries: 1,
      })
    ).resolves.toBe("ok")
    expect(calls).toBe(2)
  })

  it("maps 404 to a plain message without retrying", async () => {
    let calls = 0
    const fake = (async () => {
      calls += 1
      return new Response("", { status: 404 })
    }) as unknown as typeof fetch
    await expect(
      fetchText("https://www.rightmove.co.uk/properties/1", {
        allowedHosts: RIGHTMOVE_HOSTS,
        fetchImpl: fake,
      })
    ).rejects.toThrow("That listing no longer exists.")
    expect(calls).toBe(1)
  })
})

describe("provider", () => {
  it("returns a failed result (never throws) when the fetch fails", async () => {
    const fake = (async () => {
      throw new TypeError("network down")
    }) as unknown as typeof fetch
    const r = await createRightmoveProvider(fake).fetch(
      "https://www.rightmove.co.uk/properties/123456"
    )
    expect(r.status).toBe("failed")
    expect(r.message).toMatch(/couldn't reach/)
  }, 10_000)

  it("parses a fetched page and keeps the raw HTML for the snapshot", async () => {
    const html = fixture("rightmove-synthetic-model.html")
    const fake = (async () =>
      new Response(html, { status: 200 })) as unknown as typeof fetch
    const r = await createRightmoveProvider(fake).fetch(URL_1)
    expect(r.status).toBe("ok")
    expect(r.rawHtml).toBe(html)
  })
})
