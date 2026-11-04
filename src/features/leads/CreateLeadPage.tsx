import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGeoLocation } from "@/api/geo";
import { createProspect, listRibpOptions, uploadProspectDocument } from "@/api/leads";
import { getRecordList } from "@/api/records";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/types/api";
import { SkeletonBlock } from "@/components/common/EmptyState";
import { FieldSelect } from "@/components/common/FieldSelect";
import { FloatField, floatAreaClass, floatControlClass } from "@/components/common/FloatField";
import { GeoMapField } from "@/components/common/GeoMapField";
import { Breadcrumb, CardHeader } from "@/components/common/PageHeader";
import { X } from "lucide-react";
import { CREATE_LEAD_CHECKS, CreateLeadCapture, type CreateLeadPhoto } from "@/features/leads/CreateLeadCapture";
import type { RibpOption } from "@/features/leads/types";
import { formatCoordinate, toMapGeoJson } from "@/lib/geo";
import { ARBM_ROLE } from "@/lib/arbmAccess";
import { RIBP_ROLE } from "@/lib/ribAccess";
import { useSession } from "@/stores/session";
import type { UserContext } from "@/types/api";

const ENTRANCE_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

const LOCATION_ROLES = [ARBM_ROLE, RIBP_ROLE] as const;
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
  const queryClient = useQueryClient();
  const sessionUser = useSession((state) => state.user);
  const activeRole = useSession((state) => state.activeRole);
  const roleEdited = useRef(false);
  const [requirement, setRequirement] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [entrance, setEntrance] = useState("");
  const [locationRole, setLocationRole] = useState<LocationRole | "">("");
  const [locationOwner, setLocationOwner] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoLocation, setGeoLocation] = useState("");
  const [mapValue, setMapValue] = useState("");
  const [error, setError] = useState("");
  const [geoNote, setGeoNote] = useState("");
  const [photos, setPhotos] = useState<CreateLeadPhoto[]>([]);
  const [captureChecks, setCaptureChecks] = useState<Record<string, boolean>>({});
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const geocodeSeq = useRef(0);
  const geocodeTimer = useRef<number | null>(null);
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
    enabled: locationRole === RIBP_ROLE,
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
    if (locationRole === ARBM_ROLE) {
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
  const locationPeopleLoading = locationRole === RIBP_ROLE && ribpQuery.isLoading;
  const locationPeopleError = locationRole === RIBP_ROLE ? ribpQuery.error : null;

  useEffect(() => {
    if (!locationRole || !sessionUser || locationPeopleLoading) return;
    const match = locationPeople.find((row) => optionMatchesUser(row, sessionUser));
    if (match) {
      setLocationOwner((current) => current || match.name);
      return;
    }
    if (locationRole !== RIBP_ROLE) return;
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
    mutationFn: createProspect,
  });

  function applyResolvedAddress(label: string) {
    const next = label.trim();
    if (!next) return;
    setGeoLocation(next);
    setGeoNote("");
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
          if (seq !== geocodeSeq.current) return;
          if (label) applyResolvedAddress(label);
          else setGeoNote("The map pin was saved, but the geo location text could not be resolved. Type it in the box.");
        })
        .catch(() => {
          if (seq === geocodeSeq.current) {
            setGeoNote("The map pin was saved, but the geo location text could not be resolved. Type it in the box.");
          }
        })
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
    if (!photos.length) {
      setError("Capture or attach at least one site photo.");
      return;
    }
    if (!CREATE_LEAD_CHECKS.every((label) => captureChecks[label])) {
      setError("Complete the checklist below the geo location.");
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
        complete_address_of_the_property: geoLocation || undefined,
        geo_latitude: lat || undefined,
        geo_longitude: lng || undefined,
        geo_location: geoLocation || undefined,
        map: mapValue || toMapGeoJson(lat, lng),
        location_captured_by_role: locationRole,
        regional_infra_business_partner:
          locationRole === RIBP_ROLE ? locationOwner : undefined,
        area_regional_business_manager:
          locationRole === ARBM_ROLE ? locationOwner : undefined,
        capture_checklist: captureChecks,
      });
      const uploadFailures: string[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        const slot = `Capture ${index + 1}`;
        try {
          await uploadProspectDocument(result.name, slot, photos[index].file);
        } catch {
          uploadFailures.push(slot);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["leadProspectList"] });
      navigate(`/chola360/prospects/${encodeURIComponent(result.name)}/site-images`, {
        replace: true,
        state: uploadFailures.length
          ? { uploadError: `These photos did not upload: ${uploadFailures.join(", ")}. Add them again here.` }
          : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the Lead Prospect. A Lead Request was not created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:pb-0">
      <Breadcrumb current="Create Lead" />
      <div className="ims-card w-full min-w-0 max-w-full overflow-hidden">
        <CardHeader
          title="Create Property Lead"
          subtitle="Pin the location and capture a photo. Proceed opens Site Image Capture. The lead is created after the 17-point checklist."
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
            <div className="min-w-0 max-w-full lg:col-span-2">
              <FieldSelect
                floated
                label="Branch opening requirement"
                value={requirement}
                required
                placeholder="Select"
                emptyMessage="No open NBD requirements found."
                options={requirementOptions}
                onChange={(next) => {
                  setRequirement(next);
                  if (locationRole === RIBP_ROLE) setLocationOwner("");
                  const row = options.find((item) => item.name === next);
                  if (row?.location_details) setLocationDetails(String(row.location_details));
                }}
              />
              {options.length === 0 ? (
                <span className="mt-1.5 block text-xs text-amber-700">
                  No open requirements without a Proposed Branch. Submit a New Branch Details with “Select via Lead Request”
                  first.
                </span>
              ) : null}
            </div>

            <FloatField label="Branch Location">
              <input
                className={floatControlClass}
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Select"
              />
            </FloatField>

            <FieldSelect
              floated
              label="Main entrance direction"
              value={entrance}
              placeholder="Select"
              options={entranceOptions}
              onChange={setEntrance}
            />

            <FieldSelect
              floated
              label="Who captures the location"
              value={locationRole}
              required
              placeholder="Select"
              options={LOCATION_ROLES.map((role) => ({ value: role, label: role }))}
              onChange={(next) => {
                roleEdited.current = true;
                setLocationRole(next as LocationRole);
                setLocationOwner("");
              }}
            />

            <div className="min-w-0 max-w-full">
              <FieldSelect
                floated
                label={locationRole || "Person"}
                value={locationOwner}
                required
                disabled={!locationRole || locationPeopleLoading}
                placeholder={!locationRole ? "Select" : locationPeopleLoading ? "Loading people…" : "Select"}
                emptyMessage={
                  locationRole === ARBM_ROLE
                    ? "The signed-in user could not be resolved."
                    : "No Regional Infra Business Partner is mapped for this requirement."
                }
                options={locationOwnerOptions}
                onChange={setLocationOwner}
              />
              {locationPeopleError ? (
                <span className="mt-1.5 block text-xs text-rose-600">
                  {locationPeopleError instanceof ApiError
                    ? locationPeopleError.message
                    : "Could not load people for this role."}
                </span>
              ) : null}
            </div>

            <label className="block min-w-0 max-w-full space-y-1.5 lg:col-span-2">
              <span className="text-sm font-semibold text-ims-ink">Map location</span>
              <GeoMapField
                value={mapValue}
                editable
                hideCoordinates
                hideLocationLabel
                frameClassName="h-44 max-w-full sm:h-56"
                className="min-w-0 max-w-full [&_.leaflet-container]:max-w-full [&_.leaflet-control-attribution]:max-w-[65%] [&_.leaflet-control-attribution]:truncate"
                address={geoLocation || null}
                onChange={(_geoJson, point) => {
                  applyCoordinates(point.latitude, point.longitude);
                  resolveAddress(point.latitude, point.longitude);
                }}
                onAddressChange={(label) => {
                  if (!label.trim()) return;
                  geocodeSeq.current += 1;
                  if (geocodeTimer.current) window.clearTimeout(geocodeTimer.current);
                  setResolvingAddress(false);
                  applyResolvedAddress(label);
                }}
              />
            </label>

            <FloatField label="Latitude">
              <input
                className={floatControlClass}
                inputMode="decimal"
                required
                value={latitude}
                onChange={(e) => onManualCoordChange(e.target.value, longitude)}
                placeholder="e.g. 13.010800"
              />
            </FloatField>
            <FloatField label="Longitude">
              <input
                className={floatControlClass}
                inputMode="decimal"
                required
                value={longitude}
                onChange={(e) => onManualCoordChange(latitude, e.target.value)}
                placeholder="e.g. 80.212400"
              />
            </FloatField>

            <div className="min-w-0 max-w-full self-start lg:col-span-2">
              <FloatField label="Geo location" multiline>
                <textarea
                  className={floatAreaClass}
                  rows={2}
                  value={geoLocation}
                  onChange={(e) => setGeoLocation(e.target.value)}
                  placeholder="Address from the map pin"
                />
              </FloatField>
              {geoNote && !resolvingAddress ? (
                <span className="mt-1.5 block text-xs text-amber-700">{geoNote}</span>
              ) : null}
            </div>

            <CreateLeadCapture
              photos={photos}
              onPhotos={setPhotos}
              checks={captureChecks}
              onToggle={(label) => setCaptureChecks((current) => ({ ...current, [label]: !current[label] }))}
            />

            {error ? <p className="text-sm text-rose-600 lg:col-span-2">{error}</p> : null}

            <div className="min-w-0 lg:col-span-2">
              <button type="submit" className="ims-btn-primary w-full disabled:opacity-50 sm:w-auto" disabled={saving || create.isPending}>
                {saving || create.isPending ? "Saving…" : "Proceed"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
