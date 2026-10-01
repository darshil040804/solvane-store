import { getSession } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/wishlist";

// The signed-in customer's saved product ids, for the hearts on cached pages.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ signedIn: false, productIds: [] });
  const productIds = await getWishlistProductIds(session.user.id);
  return Response.json(
    { signedIn: true, productIds },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
