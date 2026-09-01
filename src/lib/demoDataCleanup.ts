import { getTenantSlugClient, getTenantStorageKey } from "@/lib/clientStorage";

const TENANT_DATA_PREFIXES = [
  "palmera_contacts",
  "palmera_sales_leads",
  "palmera_sales_opportunities",
  "palmera_sales_followups",
  "palmera_sales_operations",
  "palmera_audit_logs",
  "palmera_reservations",
  "palmera_reservation_communications",
  "palmera_consumption",
  "palmera_waste",
  "palmera_haccp",
  "palmera_daily_reports",
  "palmera_purchasing",
  "palmera_team",
];

export const CLEAN_SLATE_KEY = "palmera_clean_slate";

export function isTenantDataCleared(slug = getTenantSlugClient()): boolean {
  return localStorage.getItem(`${CLEAN_SLATE_KEY}_${slug}`) !== null;
}

export function clearTenantDemoData(): { removedKeys: number; removedRecords: number } {
  const slug = getTenantSlugClient();
  const keysToRemove = new Set<string>();

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const isTenantData = TENANT_DATA_PREFIXES.some((prefix) => key === `${prefix}_${slug}`);
    if (isTenantData || key === "palmera_audit_logs") keysToRemove.add(key);
  }

  let removedRecords = 0;
  keysToRemove.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) removedRecords += parsed.length;
      } catch {
        // Non-JSON values still represent one stored data item.
        removedRecords += 1;
      }
    }
    localStorage.removeItem(key);
  });

  // Components use this marker to avoid recreating their demo fixtures on reload.
  localStorage.setItem(`${CLEAN_SLATE_KEY}_${slug}`, new Date().toISOString());
  window.dispatchEvent(new Event("palmera_demo_data_cleared"));

  return { removedKeys: keysToRemove.size, removedRecords };
}

export function clearTenantDataMarker(): void {
  localStorage.removeItem(`${CLEAN_SLATE_KEY}_${getTenantSlugClient()}`);
}

export function getTenantDataStorageKey(baseKey: string): string {
  return getTenantStorageKey(baseKey);
}
