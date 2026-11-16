import { toast } from "sonner"

/**
 * Copies the deal's link for pasting into a message. Anyone in the workspace
 * can open it; signed-out visitors sign in first and land on the deal.
 */
export async function copyDealLink(dealId: string): Promise<void> {
  const url = `${window.location.origin}/deals/${dealId}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success("Link copied")
  } catch {
    // Clipboard can be blocked (permissions, insecure context): show the link.
    toast.message("Copy this link", { description: url })
  }
}
