import { NextResponse, type NextRequest } from "next/server";
import { marketplace } from "@/lib/marketplace";

// Typeahead for the house and fragrance pickers. The catalogue is public, so
// this uses the anon client (or sample data with no Supabase keys).
//   ?q=dio           houses matching "dio"
//   ?house=<id>&q=sa  that house's fragrances matching "sa"
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").slice(0, 100);
  const houseId = params.get("house") || undefined;
  const results = await marketplace.searchCatalogue(query, houseId);
  return NextResponse.json(results);
}
