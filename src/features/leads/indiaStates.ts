/** Fixed State list for Property Details. The list does not filter as the user types. */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const ALIASES: Record<string, (typeof INDIA_STATES)[number]> = {
  tamilnadu: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  "nct of delhi": "Delhi",
  "new delhi": "Delhi",
};

function canonical(value: string) {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return "";
  if (ALIASES[key]) return ALIASES[key];
  return INDIA_STATES.find((state) => state.toLowerCase() === key) || "";
}

/** Prefer a saved State, then a state name already present in the address or geo location. */
export function stateFromLead(lead: Record<string, unknown>) {
  const saved = canonical(String(lead.state ?? ""));
  if (saved) return saved;
  const haystack = `${lead.geo_location ?? ""} ${lead.complete_address_of_the_property ?? ""} ${lead.location_details ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!haystack.trim()) return String(lead.state ?? "").trim();
  const ordered = [...INDIA_STATES].sort((left, right) => right.length - left.length);
  const found = ordered.find((state) => haystack.includes(state.toLowerCase()));
  if (found) return found;
  for (const [alias, state] of Object.entries(ALIASES)) {
    if (haystack.includes(alias)) return state;
  }
  return String(lead.state ?? "").trim();
}
