/** All timestamps are stored in UTC; display in the UK locale and timezone. */
const DISPLAY_TIMEZONE = "Europe/London"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: DISPLAY_TIMEZONE,
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DISPLAY_TIMEZONE,
})

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", {
  numeric: "auto",
})

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatRelative(
  value: Date | string,
  now: Date = new Date()
): string {
  const diff = new Date(value).getTime() - now.getTime()
  const abs = Math.abs(diff)
  if (abs < MINUTE) return "just now"
  if (abs < HOUR)
    return relativeFormatter.format(Math.round(diff / MINUTE), "minute")
  if (abs < DAY)
    return relativeFormatter.format(Math.round(diff / HOUR), "hour")
  if (abs < WEEK) return relativeFormatter.format(Math.round(diff / DAY), "day")
  return formatDate(value)
}

export function daysBetween(from: Date | string, to: Date | string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY)
}
