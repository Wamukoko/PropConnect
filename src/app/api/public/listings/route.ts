import { NextResponse } from "next/server";
import { listPublicProperties } from "@/lib/public/listings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const property_type = searchParams.get("property_type") || undefined;
  const listing_type = searchParams.get("listing_type") || undefined;
  const search = searchParams.get("search") || undefined;
  const price_min = searchParams.get("price_min")
    ? Number(searchParams.get("price_min"))
    : undefined;
  const price_max = searchParams.get("price_max")
    ? Number(searchParams.get("price_max"))
    : undefined;

  const listings = await listPublicProperties({
    property_type,
    listing_type,
    search,
    price_min,
    price_max,
  });

  return NextResponse.json({ listings });
}
