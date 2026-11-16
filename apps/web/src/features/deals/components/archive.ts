import { toast } from "sonner"

import { setDealArchived } from "../actions"

/** Archive or restore a deal, with a toast. The server action revalidates the page. */
export async function toggleArchive(
  dealId: string,
  archive: boolean
): Promise<boolean> {
  const result = await setDealArchived({ dealId, archived: archive })
  if (!result.ok) {
    toast.error(result.message)
    return false
  }
  toast.success(
    archive
      ? "Archived. Find it under Archived on the Deals page."
      : "Restored to your deals."
  )
  return true
}
