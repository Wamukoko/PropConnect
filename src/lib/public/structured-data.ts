export interface PublicPropertyPhoto {
  url: string;
  alt_text: string | null;
}

export interface PublicPropertyForSEO {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: "sale" | "rent" | "lease";
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  land_area: number | null;
  amenities: string[];
  public_location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  listing_url: string;
  photos: PublicPropertyPhoto[];
  brand: {
    firmName: string;
    phone: string | null;
    contactName: string | null;
  };
}

export function buildListingStructuredData(p: PublicPropertyForSEO): Record<string, unknown> {
  const offers: Record<string, unknown> = {
    "@type": "Offer",
    price: p.price,
    priceCurrency: p.currency,
    availability: p.listing_type === "sale" ? "https://schema.org/InStock" : "https://schema.org/InStock",
    url: p.listing_url,
  };
  if (p.listing_type !== "sale") {
    offers.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price: p.price,
      priceCurrency: p.currency,
      unitText: p.listing_type === "rent" ? "PER_MONTH" : "PER_LEASE",
    };
  }

  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
  };
  if (p.public_location_text) {
    address.addressLocality = p.public_location_text;
  }

  const geo: Record<string, unknown> = {
    "@type": "GeoCoordinates",
  };
  if (p.latitude !== null && p.longitude !== null) {
    geo.latitude = p.latitude;
    geo.longitude = p.longitude;
  }

  const seller: Record<string, unknown> = {
    "@type": "RealEstateAgent",
    name: p.brand.firmName,
  };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description || p.title,
    image: p.photos.map((photo) => photo.url),
    url: p.listing_url,
    offers,
    address,
    geo,
    brand: { "@type": "Brand", name: p.brand.firmName },
    seller,
    additionalProperty: buildAdditionalProperties(p),
  };
}

function buildAdditionalProperties(p: PublicPropertyForSEO): Record<string, unknown>[] {
  const props: Record<string, unknown>[] = [];
  const add = (name: string, value: unknown) =>
    props.push({ "@type": "PropertyValue", name, value });

  add("propertyType", p.property_type);
  add("listingType", p.listing_type);
  if (p.bedrooms !== null) add("bedrooms", p.bedrooms);
  if (p.bathrooms !== null) add("bathrooms", p.bathrooms);
  if (p.floor_area !== null) add("floorArea", `${p.floor_area} m²`);
  if (p.land_area !== null) add("landArea", `${p.land_area} m²`);
  if (p.amenities?.length) add("amenities", p.amenities.join(", "));
  return props;
}
