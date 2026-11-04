/** Monthly rent ÷ built-up area. Empty until both numbers are present. */
export function rentPerSqft(monthlyRent: unknown, builtUpArea: unknown) {
  const rent = Number(String(monthlyRent ?? "").replace(/,/g, ""));
  const area = Number(String(builtUpArea ?? "").replace(/,/g, ""));
  if (!Number.isFinite(rent) || !Number.isFinite(area) || rent <= 0 || area <= 0) return "";
  return String(Math.round((rent / area) * 100) / 100);
}

export function withRentPerSqft<T extends Record<string, string>>(values: T): T {
  return {
    ...values,
    rent_per_sq_feet: rentPerSqft(values.monthly_rent, values.built_up_area_sqft),
  };
}
