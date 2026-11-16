import type { DefaultsSource } from "@/lib/inputs/registry"
import { DEFAULT_SETTINGS } from "./schemas"

it("workspace settings defaults satisfy the input registry's defaults source", () => {
  const source: DefaultsSource["defaults"] = DEFAULT_SETTINGS.defaults
  expect(source.keep.refinanceLegalPence).toBe(100_000)
})
