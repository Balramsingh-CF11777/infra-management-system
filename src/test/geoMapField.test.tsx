import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentForm } from "@/components/documents/DocumentForm";
import type { DocumentField, DocumentPayload } from "@/types/api";

vi.mock("@/api/geo", () => ({ getGeoLocation: vi.fn().mockResolvedValue("Chennai, India") }));

function payload(fields: DocumentField[]): DocumentPayload {
  return {
    summary: {
      doctype: "Proposed Branch Details",
      doctype_label: "Proposed Branch",
      name: "PROP-1",
      title: "PROP-1",
      workflow_state: "Assigned to RIBP for Property Details",
      workflow_state_label: "Property Details",
      docstatus: 0,
      owner: "ribp@example.com",
      creation: "",
      modified: "2026-10-12 07:00:00",
    },
    form: { can_write: true, editable: true, sections: [{ label: "Location", tab: "Property Details", fields }] },
  };
}

describe("DocumentForm geolocation", () => {
  it("renders a Leaflet map instead of raw GeoJSON", () => {
    const mapValue = JSON.stringify({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [80.2124, 13.0108] } }],
    });
    const fields: DocumentField[] = [
      { fieldname: "map", label: "Map", fieldtype: "Geolocation", options: "", description: "", reqd: false, read_only: true, value: mapValue },
      { fieldname: "geo_latitude", label: "Latitude", fieldtype: "Float", options: "", description: "", reqd: false, read_only: true, value: 13.0108 },
      { fieldname: "geo_longitude", label: "Longitude", fieldtype: "Float", options: "", description: "", reqd: false, read_only: true, value: 80.2124 },
      { fieldname: "geo_location", label: "Geo Location", fieldtype: "Data", options: "", description: "", reqd: false, read_only: true, value: "Sample address" },
    ];
    render(<DocumentForm payload={payload(fields)} saving={false} onSave={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Location map" })).toBeInTheDocument();
    expect(screen.getByText("13.010800")).toBeInTheDocument();
    expect(screen.getByText("80.212400")).toBeInTheDocument();
    expect(screen.getByText("Sample address")).toBeInTheDocument();
    expect(screen.queryByText(/FeatureCollection/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
  });
});
