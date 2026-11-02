import { RECORD_API } from "@/api/records";

describe("record APIs", () => {
  it("maps each request DocType to a dedicated portal module", () => {
    expect(RECORD_API["New Branch Details"]).toBe("infra_ms.portal.new_branch");
    expect(RECORD_API["MIS New Branch Initiation"]).toBe("infra_ms.portal.mis_allocation");
    expect(RECORD_API["Branch Layout Details"]).toBe("infra_ms.portal.branch_layout");
    expect(RECORD_API["Query Log Details"]).toBe("infra_ms.portal.query_log_details");
    expect(Object.keys(RECORD_API)).toHaveLength(10);
  });
});
