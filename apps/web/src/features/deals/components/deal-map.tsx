"use client"

import { useState, type ReactNode } from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/*
 * Where the property is: a static preview built from Esri's Light/Dark Gray
 * Canvas tiles (a base layer plus a labels layer). No map library: + and −
 * buttons step the zoom; anywhere else on the map opens the pin in your maps
 * app. Dragging/pinching is deliberately off: it would hijack page scrolling.
 * No key needed; Esri's terms require the attribution shown. (CARTO's
 * basemaps now need an API key, so they're not used.)
 */

// Esri's grey canvas has tiles up to zoom 16 (street level); 11 shows the town.
const MIN_ZOOM = 11
const MAX_ZOOM = 16
const START_ZOOM = 15 // ≈ 1km across in the UK: the street and its surroundings
const TILE = 256 // pixels per tile
const COLS = 5 // enough tiles to cover a wide card, centred on the pin
const ROWS = 3

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas"
const STYLES = {
  light: ["World_Light_Gray_Base", "World_Light_Gray_Reference"],
  dark: ["World_Dark_Gray_Base", "World_Dark_Gray_Reference"],
} as const

/** Web Mercator: fractional tile coordinates of a point at a zoom level. */
export function tileCoords(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom
  const latRad = (lat * Math.PI) / 180
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n,
  }
}

function Tiles({
  style,
  zoom,
  x,
  y,
  className,
}: {
  style: keyof typeof STYLES
  zoom: number
  x: number
  y: number
  className?: string
}) {
  const left0 = Math.floor(x) - Math.floor(COLS / 2)
  const top0 = Math.floor(y) - Math.floor(ROWS / 2)
  // Offset so the pin's exact pixel sits at the centre of the preview.
  const pinX = (x - left0) * TILE
  const pinY = (y - top0) * TILE
  const tiles = []
  // Base first, then labels on top. Esri tile paths are z/y/x.
  for (const layer of STYLES[style])
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        const tx = left0 + col
        const ty = top0 + row
        tiles.push(
          // eslint-disable-next-line @next/next/no-img-element -- remote map tiles, not optimised
          <img
            key={`${layer}-${zoom}-${tx}-${ty}`}
            src={`${ESRI}/${layer}/MapServer/tile/${zoom}/${ty}/${tx}`}
            alt=""
            width={TILE}
            height={TILE}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: col * TILE, top: row * TILE }}
          />
        )
      }
  return (
    <div
      aria-hidden
      className={cn("absolute", className)}
      style={{
        width: COLS * TILE,
        height: ROWS * TILE,
        left: `calc(50% - ${pinX}px)`,
        top: `calc(50% - ${pinY}px)`,
      }}
    >
      {tiles}
    </div>
  )
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:text-muted-foreground disabled:opacity-50 md:size-8"
    >
      {children}
    </button>
  )
}

export function DealMap({
  lat,
  lng,
  address,
}: {
  lat: number
  lng: number
  address: string
}) {
  const [zoom, setZoom] = useState(START_ZOOM)
  const { x, y } = tileCoords(lat, lng, zoom)
  // Universal link: the Google Maps app on phones, the website elsewhere.
  const open = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`

  return (
    <div className="relative h-36 overflow-hidden rounded-md border bg-muted sm:h-44">
      {/* Only the visible theme's tiles load (hidden lazy images aren't fetched). */}
      <Tiles style="light" zoom={zoom} x={x} y={y} className="dark:hidden" />
      <Tiles
        style="dark"
        zoom={zoom}
        x={x}
        y={y}
        className="hidden dark:block"
      />

      {/* Pin: its tip marks the spot, at the exact centre. */}
      <svg
        viewBox="0 0 24 32"
        aria-hidden
        className="absolute top-1/2 left-1/2 h-8 w-6 -translate-x-1/2 -translate-y-full drop-shadow"
      >
        <path
          d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0Z"
          className="fill-brand"
        />
        <circle cx="12" cy="12" r="4.5" className="fill-background" />
      </svg>

      {/* The map itself opens Maps; the zoom buttons sit above this link. */}
      <a
        href={open}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${address} in Maps`}
        className="group absolute inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <span className="absolute right-2 bottom-2 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm group-hover:bg-background">
          Open in Maps
        </span>
      </a>

      <div
        role="group"
        aria-label="Map zoom"
        className="absolute top-2 right-2 flex flex-col divide-y overflow-hidden rounded-md border bg-background/95 shadow-sm"
      >
        <ZoomButton
          label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
        >
          <PlusIcon className="size-4" aria-hidden />
        </ZoomButton>
        <ZoomButton
          label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
        >
          <MinusIcon className="size-4" aria-hidden />
        </ZoomButton>
      </div>

      <span className="pointer-events-none absolute bottom-1 left-1.5 rounded-sm bg-background/75 px-1 text-[0.625rem] text-foreground/80">
        Esri, HERE, Garmin, © OpenStreetMap
      </span>
    </div>
  )
}
