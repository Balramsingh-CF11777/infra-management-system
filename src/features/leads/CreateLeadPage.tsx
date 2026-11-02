import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getGeoLocation } from "@/api/geo";
import { createLead, listRibpOptions } from "@/api/leads";
import { getRecordList } from "@/api/records";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/types/api";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { GeoMapField } from "@/components/common/GeoMapField";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { X } from "lucide-react";
import { LeadCreatedSuccessSheet } from "@/features/leads/LeadCreatedSuccessSheet";
import type { RibpOption } from "@/features/leads/types";
import { formatCoordinate, toMapGeoJson } from "@/lib/geo";
import { useSession } from "@/stores/session";
import type { UserContext } from "@/types/api";

const ENTRANCE_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

const LOCATION_ROLES = ["Area Regional Business Manager", "Regional Infra Business Partner"] as const;
type LocationRole = (typeof LOCATION_ROLES)[number];

function isLocationRole(value: string): value is LocationRole {
  return (LOCATION_ROLES as readonly string[]).includes(value);
}

/** Working-as role first, then the user's default, then a single matching role. */
function captureRoleForSession(activeRole: string, user: UserContext | null): LocationRole | "" {
  const working = activeRole.trim();
  if (isLocationRole(working)) return working;
  const preferred = String(user?.default_role_label || user?.default_role || "").trim();
  if (isLocationRole(preferred)) return preferred;
  const found = new Set<LocationRole>();
  for (const value of [...(user?.role_labels ?? []), ...(user?.roles ?? [])]) {
    const text = String(value || "").trim();
    if (isLocationRole(text)) found.add(text);
  }
  if (found.size === 1) return [...found][0];
  return "";
}

function userHoldsLocationRole(user: UserContext, activeRole: string, role: LocationRole): boolean {
  if (activeRole.trim() === role) return true;
  return [user.default_role, user.default_role_label, ...user.roles, ...user.role_labels].some(
    (value) => String(value || "").trim() === role,
  );
}

/** Frappe full names here look like "Kavitha S-IT-Chola Thamarai – Guindy-Business S". */
function displayPersonName(fullName: string, fallback: string): string {
  const name = fullName.trim();
  if (!name) return fallback;
  const hyphen = name.search(/[-–—]/);
  if (hyphen > 1) return name.slice(0, hyphen).trim();
  return name;
}

function optionMatchesUser(row: RibpOption, user: UserContext): boolean {
  const keys = [user.user, user.full_name].map((value) => value.trim().toLowerCase()).filter(Boolean);
  const fields = [row.name, row.full_name, row.email]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return keys.some((key) => fields.includes(key));
}

export function CreateLeadPage() {
  const navigate = useNavigate();
  const sessionUser = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const roleEdited = useRef(false);
  const [requirement, setRequirement] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [entrance, setEntrance] = useState("");
  const [locationRole, setLocationRole] = useState<LocationRole | "">("");
  const [locationOwner, setLocationOwner] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoLocation, setGeoLocation] = useState("");
  const [mapValue, setMapValue] = useState("");
  const [error, setError] = useState("");
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const geocodeSeq = useRef(0);
  const geocodeTimer = useRef<number | null>(null);
  const [created, setCreated] = useState<{
    name: string;
    property_id: string;
    location_label: string;
  } | null>(null);

  const openRequirements = useQuery({
    queryKey: queryKeys.documentList("New Branch Details", { workflow_state: "Submit", page_length: 50 }),
    queryFn: () =>
      getRecordList("New Branch Details", {
        workflow_state: "Submit",
        page_length: 50,
      }),
  });

  const options = useMemo(() => {
    const items = openRequirements.data?.items ?? [];
    return items.filter((row) => !row.proposed_branch_id);
  }, [openRequirements.data]);

  const selectedRequirement = useMemo(
    () => options.find((row) => row.name === requirement),
    [options, requirement],
  );

  const ribpQuery = useQuery({
    queryKey: [
      "leadRibpOptions",
      requirement,
      String(selectedRequirement?.product_line || ""),
      String(selectedRequirement?.region || ""),
    ],
    queryFn: () =>
      listRibpOptions({
        requirement: requirement || undefined,
        product_line: String(selectedRequirement?.product_line || "") || undefined,
        region: String(selectedRequirement?.region || "") || undefined,
      }),
    enabled: locationRole === "Regional Infra Business Partner",
    staleTime: 30_000,
  });

  const sessionCaptureRole = captureRoleForSession(activeRole, sessionUser);

  useEffect(() => {
    if (roleEdited.current || !sessionCaptureRole || locationRole === sessionCaptureRole) return;
    setLocationRole(sessionCaptureRole);
    setLocationOwner("");
  }, [sessionCaptureRole, locationRole]);

  const requirementOptions = useMemo(
    () =>
      options.map((row) => {
        const location = String(row.location_details || "").trim();
        const product = String(row.product_line || "").trim();
        return {
          value: row.name,
          label: location || row.name,
          hint: location ? row.name : product || undefined,
        };
      }),
    [options],
  );

  const entranceOptions = useMemo(() => ENTRANCE_OPTIONS.map((opt) => ({ value: opt, label: opt })), []);

  const locationPeople = useMemo(() => {
    if (locationRole === "Area Regional Business Manager") {
      if (!sessionUser?.user) return [];
      return [
        {
          name: sessionUser.user,
          full_name: displayPersonName(sessionUser.full_name || "", sessionUser.user),
          email: sessionUser.user,
        },
      ];
    }
    const rows = ribpQuery.data?.items || [];
    if (!sessionUser?.user || !locationRole || !userHoldsLocationRole(sessionUser, activeRole, locationRole)) {
      return rows;
    }
    if (rows.some((row) => optionMatchesUser(row, sessionUser))) return rows;
    return [
      {
        name: sessionUser.user,
        full_name: displayPersonName(sessionUser.full_name || "", sessionUser.user),
        email: sessionUser.user,
      },
      ...rows,
    ];
  }, [activeRole, locationRole, ribpQuery.data?.items, sessionUser]);
  const locationPeopleLoading = locationRole === "Regional Infra Business Partner" && ribpQuery.isLoading;
  const locationPeopleError = locationRole === "Regional Infra Business Partner" ? ribpQuery.error : null;

  useEffect(() => {
    if (!locationRole || !sessionUser || locationPeopleLoading) return;
    const match = locationPeople.find((row) => optionMatchesUser(row, sessionUser));
    if (match) {
      setLocationOwner((current) => current || match.name);
      return;
    }
    if (locationRole !== "Regional Infra Business Partner") return;
    const suggested = ribpQuery.data?.suggested || "";
    if (!suggested) return;
    const names = new Set(locationPeople.map((row) => row.name));
    if (names.has(suggested)) {
      setLocationOwner((current) => current || suggested);
    }
  }, [locationPeople, locationPeopleLoading, locationRole, ribpQuery.data?.suggested, sessionUser]);

  const locationOwnerOptions = useMemo(
    () =>
      locationPeople.map((row) => {
        const isSelf = sessionUser ? optionMatchesUser(row, sessionUser) : false;
        const label =
          isSelf && sessionUser
            ? displayPersonName(sessionUser.full_name || row.full_name || "", row.name)
            : row.full_name || row.name;
        const hint = isSelf ? undefined : row.email && row.email !== label ? row.email : row.name !== label ? row.name : undefined;
        return { value: row.name, label, hint };
      }),
    [locationPeople, sessionUser],
  );

  const create = useMutation({
    mutationFn: createLead,
  });

  function applyResolvedAddress(label: string) {
    const next = label.trim();
    if (!next) return;
    setGeoLocation(next);
    setAddress(next);
  }

  function applyCoordinates(lat: number, lng: number, label?: string) {
    const latText = formatCoordinate(lat);
    const lngText = formatCoordinate(lng);
    setLatitude(latText);
    setLongitude(lngText);
    setMapValue(toMapGeoJson(lat, lng));
    if (label) applyResolvedAddress(label);
  }

  function resolveAddress(lat: number, lng: number) {
    const seq = ++geocodeSeq.current;
    if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current);
    setResolvingAddress(true);
    geocodeTimer.current = window.setTimeout(() => {
      void getGeoLocation(lat, lng)
        .then((label) => {
          if (seq !== geocodeSeq.current || !label) return;
          applyResolvedAddress(label);
        })
        .catch(() => undefined)
        .finally(() => {
          if (seq === geocodeSeq.current) setResolvingAddress(false);
        });
    }, 450);
  }

  function onManualCoordChange(nextLat: string, nextLng: string) {
    setLatitude(nextLat);
    setLongitude(nextLng);
    const lat = Number(nextLat);
    const lng = Number(nextLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setMapValue(toMapGeoJson(lat, lng));
      resolveAddress(lat, lng);
    }
  }

  useEffect(() => {
    return () => {
      if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current);
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!requirement) {
      setError("Select a branch-opening requirement.");
      return;
    }
    if (!locationRole) {
      setError("Select Area Regional Business Manager or Regional Infra Business Partner.");
      return;
    }
    if (!locationOwner) {
      setError(`Select the ${locationRole} who will capture the location.`);
      return;
    }
    const lat = latitude.trim();
    const lng = longitude.trim();
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const coordsOk =
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180;
    if (!coordsOk) {
      setError("Enter latitude and longitude, or pin the location on the map.");
      return;
    }
    const selected = options.find((row) => row.name === requirement);
    setSaving(true);
    try {
      const result = await create.mutateAsync({
        branch_opening_requirement: requirement,
        location_details: locationDetails || String(selected?.location_details || ""),
        product_line: String(selected?.product_line || ""),
        main_entrance_direction: entrance || undefined,
        complete_address_of_the_property: address || undefined,
        geo_latitude: lat || undefined,
        geo_longitude: lng || undefined,
        geo_location: geoLocation || undefined,
        map: mapValue || toMapGeoJson(lat, lng),
        location_captured_by_role: locationRole,
        regional_infra_business_partner:
          locationRole === "Regional Infra Business Partner" ? locationOwner : undefined,
        area_regional_business_manager:
          locationRole === "Area Regional Business Manager" ? locationOwner : undefined,
      });
      const label =
        (locationDetails || String(selected?.location_details || "")).trim() ||
        String(selected?.location_details || requirement || "").trim();
      setCreated({
        name: result.name,
        property_id: result.property_id || result.name,
        location_label: label ? (label.toLowerCase().includes("branch") ? label : `${label} Branch`) : "Property Lead",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the lead.");
    } finally {
      setSaving(false);
    }
  }

  function onCreatedDone() {
    if (!created) return;
    navigate(`/chola360/leads/${encodeURIComponent(created.name)}/site-images`, { replace: true });
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:pb-0">
      <Breadcrumb current="Create Lead" />
      <div className="ims-card w-full min-w-0 max-w-full overflow-hidden">
        <CardHeader
          title="Create Property Lead"
          subtitle="Capture a competing property under an open New Branch requirement. Site photos are added on the next screen."
          subtitleClassName="mt-0.5 hidden text-sm text-slate-500 lg:block"
        >
          <Link
            to="/chola360/leads"
            aria-label="Cancel"
            className="ims-btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center p-0 no-underline lg:h-auto lg:w-auto lg:px-4"
          >
            <X className="h-4 w-4 lg:hidden" aria-hidden />
            <span className="hidden lg:inline">Cancel</span>
          </Link>
        </CardHeader>

        {openRequirements.isLoading ? (
          <div className="px-4 pb-5 sm:px-5">
            <SkeletonBlock className="h-48" />
          </div>
        ) : (
          <form
            className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 border-t border-ims-line px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-2"
            onSubmit={onSubmit}
          >
            <label className="block min-w-0 max-w-full space-y-1.5 lg:col-span-2">
              <span className="text-sm font-semibold text-ims-ink">Branch opening requirement</span>
              <FieldSelect
                value={requirement}
                required
                placeholder="Select open NBD…"
                emptyMessage="No open NBD requirements found."
                options={requirementOptions}
                onChange={(next) => {
                  setRequirement(next);
                  if (locationRole === "Regional Infra Business Partner") setLocationOwner("");
                  const row = options.find((item) => item.name === next);
                  if (row?.location_details) setLocationDetails(String(row.location_details));
                }}
              />
              {options.length === 0 ? (
                <span className="block text-xs text-amber-700">
                  No open requirements without a Proposed Branch. Submit a New Branch Details with “Select via Lead Request”
                  first.
                </span>
              ) : null}
            </label>

            <label className="block min-w-0 max-w-full space-y-1.5">
              <span className="text-sm font-semibold text-ims-ink">Branch / location label</span>
              <input
                className="ims-field"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Ekkatuthangal"
              />
            </label>

            <label className="block min-w-0 max-w-full space-y-1.5">
              <span className="text-sm font-semibold text-ims-ink">Main entrance direction</span>
              <FieldSelect value={entrance} placeholder="Select…" options={entranceOptions} onChange={setEntrance} />
            </label>

            <label className="block min-w-0 max-w-full space-y-1.5 lg:col-span-2">
              <span className="break-words text-sm font-semibold text-ims-ink">Who captures the location</span>
              <FieldSelect
                value={locationRole}
                required
                placeholder="Select role"
                options={LOCATION_ROLES.map((role) => ({ value: role, label: role }))}
                onChange={(next) => {
                  roleEdited.current = true;
                  setLocationRole(next as LocationRole);
                  setLocationOwner("");
                }}
              />
            </label>

            <label className="block min-w-0 max-w-full space-y-1.5 lg:col-span-2">
              <span className="break-words text-sm font-semibold text-ims-ink">{locationRole || "Person"}</span>
              <FieldSelect
                value={locationOwner}
                required
                disabled={!locationRole || locationPeopleLoading}
                placeholder={
                  !locationRole ? "Select a role first" : locationPeopleLoading ? "Loading people…" : "Select person…"
                }
                emptyMessage={
                  locationRole === "Area Regional Business Manager"
                    ? "The signed-in user could not be resolved."
                    : "No Regional Infra Business Partner is mapped for this requirement."
                }
                options={locationOwnerOptions}
                onChange={setLocationOwner}
              />
              {locationPeopleError ? (
                <span className="block text-xs text-rose-600">
                  {locationPeopleError instanceof ApiError
                    ? locationPeopleError.message
                    : "Could not load people for this role."}
                </span>
              ) : (
                <span className="block text-xs text-slate-500">
                  This person enters the latitude and longitude, or pins the location, while the lead is still a draft.
                </span>
              )}
            </label>

            <section className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-2xl border border-ims-line p-3 sm:p-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-semibold text-ims-primary">Map location</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Required on the draft. Type latitude and longitude, or pin the point on the map. After Approve, this
                  pin is shown above the History Trail.
                </p>
              </div>

              <GeoMapField
                value={mapValue}
                editable
                hideCoordinates
                hideLocationLabel
                frameClassName="h-44 max-w-full sm:h-56"
                className="min-w-0 max-w-full [&_.leaflet-container]:max-w-full [&_.leaflet-control-attribution]:max-w-[65%] [&_.leaflet-control-attribution]:truncate"
                address={geoLocation || null}
                onChange={(_geoJson, point) => applyCoordinates(point.latitude, point.longitude)}
                onAddressChange={(label) => {
                  geocodeSeq.current += 1;
                  if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current);
                  setResolvingAddress(false);
                  applyResolvedAddress(label);
                }}
              />

              <div className="grid min-w-0 grid-cols-2 gap-3">
                <label className="block min-w-0 space-y-1.5">
                  <span className="text-sm font-semibold text-ims-ink">Latitude</span>
                  <input
                    className="ims-field"
                    inputMode="decimal"
                    required
                    value={latitude}
                    onChange={(e) => onManualCoordChange(e.target.value, longitude)}
                    placeholder="e.g. 13.010800"
                  />
                </label>
                <label className="block min-w-0 space-y-1.5">
                  <span className="text-sm font-semibold text-ims-ink">Longitude</span>
                  <input
                    className="ims-field"
                    inputMode="decimal"
                    required
                    value={longitude}
                    onChange={(e) => onManualCoordChange(latitude, e.target.value)}
                    placeholder="e.g. 80.212400"
                  />
                </label>
              </div>
            </section>

            <label className="block min-w-0 max-w-full space-y-1.5 lg:col-span-2">
              <span className="text-sm font-semibold text-ims-ink">Property address</span>
              <textarea
                className="ims-field min-h-[96px]"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Complete address of the property"
              />
              {resolvingAddress ? (
                <span className="block text-xs text-slate-500">Filling the address from the map pin…</span>
              ) : null}
            </label>

            {error ? <p className="text-sm text-rose-600 lg:col-span-2">{error}</p> : null}

            <div className="min-w-0 lg:col-span-2">
              <button type="submit" className="ims-btn-primary w-full disabled:opacity-50 sm:w-auto" disabled={saving || create.isPending}>
                {saving || create.isPending ? "Creating…" : "Save Draft Lead"}
              </button>
            </div>
          </form>
        )}
      </div>

      <LeadCreatedSuccessSheet
        open={Boolean(created)}
        locationLabel={created?.location_label || ""}
        propertyId={created?.property_id || ""}
        onDone={onCreatedDone}
      />
    </section>
  );
}
