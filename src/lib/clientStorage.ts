/**
 * Client-side utility to get tenant-specific localStorage keys based on hostname.
 */
export function getTenantStorageKey(baseKey: string): string {
  if (typeof window === "undefined") return baseKey;
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  let slug = "gastroshows"; // Fallback default
  
  if (isLocalhost) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
      slug = parts[0];
    }
  } else {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      slug = parts[0];
    }
  }
  
  return `${baseKey}_${slug.toLowerCase()}`;
}

export function getTenantSlugClient(): string {
  if (typeof window === "undefined") return "gastroshows";
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  let slug = "gastroshows";
  
  if (isLocalhost) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
      slug = parts[0];
    }
  } else {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      slug = parts[0];
    }
  }
  
  return slug.toLowerCase();
}