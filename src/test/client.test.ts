import { portalError } from "@/api/client";

describe("portal error envelopes", () => {
  it("reads a Frappe 400 that wraps {success:false}", () => {
    const error = portalError({
      success: false,
      error: { code: "WORKFLOW_FAILED", message: "No Regional Infra Business Partner is mapped for GL." },
    });
    expect(error).toMatchObject({
      code: "WORKFLOW_FAILED",
      message: "No Regional Infra Business Partner is mapped for GL.",
    });
  });

  it("ignores successful Frappe messages", () => {
    expect(portalError({ success: true, data: { name: "NBI/1" } })).toBeNull();
    expect(portalError("Not permitted")).toBeNull();
  });
});
