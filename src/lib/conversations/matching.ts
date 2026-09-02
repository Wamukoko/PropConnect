import { createAdminClient } from "@/lib/supabase/admin";

interface MatchCriteria {
  listing_type?: string;
  property_type?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_area?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  location_id?: string;
  // Advanced location matching: one or more location IDs whose alias/resolved
  // hierarchy matches the preferred area. Used to broaden area matching.
  location_ids?: string[];
}

interface PropertyCandidate {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: any;
  location_id: string | null;
  public_location_text: string | null;
  description: string | null;
  score: number;
  reasons: string[];
}

interface MatchResult {
  properties: PropertyCandidate[];
  totalMatches: number;
  criteria: MatchCriteria;
}

const WEIGHTS = {
  listing_type: 30,
  property_type: 25,
  budget: 25,
  location: 10,
  bedrooms: 5,
  bathrooms: 3,
  amenities: 2,
} as const;

export async function matchProperties(
  accountId: string,
  criteria: MatchCriteria,
  limit: number = 10
): Promise<MatchResult> {
  const supabase = createAdminClient();

  // Build base query — only published properties
  let query = supabase
    .from("properties")
    .select("*")
    .eq("account_id", accountId)
    .eq("status", "published");

  if (criteria.listing_type) {
    query = query.eq("listing_type", criteria.listing_type);
  }
  if (criteria.property_type) {
    query = query.eq("property_type", criteria.property_type);
  }
  if (criteria.location_id) {
    query = query.eq("location_id", criteria.location_id);
  } else if (criteria.location_ids?.length) {
    query = query.in("location_id", criteria.location_ids);
  }
  if (criteria.bedrooms) {
    query = query.gte("bedrooms", criteria.bedrooms);
  }

  const { data: properties, error } = await query;

  if (error || !properties?.length) {
    return { properties: [], totalMatches: 0, criteria };
  }

  // Score each property
  const scored = properties.map((prop) => scoreProperty(prop, criteria));
  scored.sort((a, b) => b.score - a.score);

  return {
    properties: scored.slice(0, limit),
    totalMatches: scored.length,
    criteria,
  };
}

function scoreProperty(property: any, criteria: MatchCriteria): PropertyCandidate {
  let score = 0;
  const reasons: string[] = [];

  // Listing type match
  if (criteria.listing_type) {
    if (property.listing_type === criteria.listing_type) {
      score += WEIGHTS.listing_type;
      reasons.push(`Matches ${criteria.listing_type} listing`);
    }
  } else {
    score += WEIGHTS.listing_type;
  }

  // Property type match
  if (criteria.property_type) {
    if (property.property_type === criteria.property_type) {
      score += WEIGHTS.property_type;
      reasons.push(`Is a ${criteria.property_type}`);
    }
  } else {
    score += WEIGHTS.property_type;
  }

  // Budget match
  if (criteria.budget_max || criteria.budget_min) {
    const withinBudget =
      (!criteria.budget_max || property.price <= criteria.budget_max) &&
      (!criteria.budget_min || property.price >= criteria.budget_min);
    if (withinBudget) {
      score += WEIGHTS.budget;
      reasons.push(
        `Within budget (${property.price.toLocaleString()} ${property.currency})`
      );
    } else if (criteria.budget_max && property.price > criteria.budget_max) {
      const overPercent = Math.round(
        ((property.price - criteria.budget_max) / criteria.budget_max) * 100
      );
      if (overPercent <= 20) {
        score += WEIGHTS.budget * 0.4;
        reasons.push(`${overPercent}% over budget`);
      }
    }
  } else {
    score += WEIGHTS.budget;
  }

  // Location match
  if (criteria.preferred_area) {
    const propLocation = (
      property.public_location_text ||
      property.description ||
      ""
    ).toLowerCase();
    if (propLocation.includes(criteria.preferred_area.toLowerCase())) {
      score += WEIGHTS.location;
      reasons.push(`In preferred area (${criteria.preferred_area})`);
    }
  } else {
    score += WEIGHTS.location;
  }

  // Bedrooms match
  if (criteria.bedrooms && property.bedrooms) {
    if (property.bedrooms >= criteria.bedrooms) {
      score += WEIGHTS.bedrooms;
      reasons.push(`${property.bedrooms} bedrooms`);
    }
  } else {
    score += WEIGHTS.bedrooms;
  }

  // Bathrooms match
  if (criteria.bathrooms && property.bathrooms) {
    if (property.bathrooms >= criteria.bathrooms) {
      score += WEIGHTS.bathrooms;
      reasons.push(`${property.bathrooms} bathrooms`);
    }
  } else {
    score += WEIGHTS.bathrooms;
  }

  // Amenities match
  if (criteria.amenities?.length && property.amenities) {
    const propAmenities: string[] = Array.isArray(property.amenities)
      ? property.amenities
      : Object.keys(property.amenities);
    const matched = criteria.amenities.filter((a) =>
      propAmenities.some((pa) => pa.toLowerCase().includes(a.toLowerCase()))
    );
    if (matched.length > 0) {
      score += WEIGHTS.amenities;
      reasons.push(`Has: ${matched.join(", ")}`);
    }
  } else {
    score += WEIGHTS.amenities;
  }

  return {
    id: property.id,
    title: property.title,
    property_type: property.property_type,
    listing_type: property.listing_type,
    price: property.price,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    amenities: property.amenities,
    location_id: property.location_id,
    public_location_text: property.public_location_text,
    description: property.description,
    score: Math.round(score),
    reasons,
  };
}

export function formatPropertyRecommendation(property: PropertyCandidate): string {
  const lines = [
    `*${property.title}*`,
    `${property.listing_type === "rent" ? "Rent" : property.listing_type === "sale" ? "For Sale" : "For Lease"}`,
    "",
    `${property.property_type} — ${property.price.toLocaleString()} ${property.currency}${property.listing_type === "rent" ? "/month" : ""}`,
  ];

  if (property.bedrooms || property.bathrooms) {
    const parts: string[] = [];
    if (property.bedrooms) parts.push(`${property.bedrooms} bed`);
    if (property.bathrooms) parts.push(`${property.bathrooms} bath`);
    lines.push(parts.join(" | "));
  }

  if (property.public_location_text) {
    lines.push(`📍 ${property.public_location_text}`);
  }

  if (property.reasons.length > 0) {
    lines.push("", `✅ ${property.reasons.join(" • ")}`);
  }

  lines.push("", `Ref: ${property.id.slice(0, 8)}`);
  return lines.join("\n");
}
