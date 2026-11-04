import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLeadDetail,
  getProspect,
  saveLeadPropertyDetails,
  saveProspectPropertyDetails,
  uploadLeadChecklistDocument,
  uploadProspectChecklistDocument,
  type LeadChecklistTable,
} from "@/api/leads";
import { queryKeys } from "@/api/keys";

export function usePropertyRecord(name: string) {
  const { pathname } = useLocation();
  const prospectMode = pathname.includes("/chola360/prospects/");
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: prospectMode ? queryKeys.leadProspect(name) : queryKeys.leadDetail(name),
    queryFn: () => (prospectMode ? getProspect(name) : getLeadDetail(name)),
    enabled: Boolean(name),
  });
  const recordBase = prospectMode
    ? `/chola360/prospects/${encodeURIComponent(name)}`
    : `/chola360/leads/${encodeURIComponent(name)}`;
  const hub = `${recordBase}/property-verification`;
  const converted =
    prospectMode &&
    (detail.data?.status === "Converted" || Boolean(detail.data?.converted_lead));

  async function saveDetails(values: Record<string, unknown>) {
    if (prospectMode) return saveProspectPropertyDetails(name, values);
    return saveLeadPropertyDetails(name, values);
  }

  async function uploadChecklist(table: LeadChecklistTable, documentType: string, file: File) {
    if (prospectMode) return uploadProspectChecklistDocument(name, table, documentType, file);
    return uploadLeadChecklistDocument(name, table, documentType, file);
  }

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: prospectMode ? queryKeys.leadProspect(name) : queryKeys.leadDetail(name),
    });
  }

  return { prospectMode, detail, hub, recordBase, converted, saveDetails, uploadChecklist, refresh };
}
