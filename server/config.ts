export const billingEnabled = false;

export const LIVE_TIERS = [
  { id: "tier1", label: "15 Min Slot",  minutes: 15, priceCents: 1000 },
  { id: "tier2", label: "30 Min Slot",  minutes: 30, priceCents: 2000 },
  { id: "tier3", label: "60 Min Slot",  minutes: 60, priceCents: 2500 },
] as const;
