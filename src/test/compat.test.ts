import { flattenQueue } from "@/api/compat";

describe("existing infra_ms.api queue shapes", () => {
  it("reads state sections (ZIBP, RLM, Infra Head)", () => {
    const items = flattenQueue(
      {
        allowed: true,
        doctype: "Proposed Branch Details",
        sections: [
          {
            state: "Assigned to ZIBP",
            count: 1,
            rows: [
              {
                name: "NBO/1",
                request_no_new: "NBI/1",
                workflow_state: "Assigned to ZIBP",
                product_line_new: "GL",
              },
            ],
          },
        ],
      },
      "Zonal Infra Business Partner",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "NBO/1",
      request_id: "NBO/1",
      property_id: "NBI/1",
      product_line: "GL",
      role_label: "Zonal Infra Business Partner",
    });
  });

  it("maps New Branch queue rows to Proposed Branch Request ID / Property ID when linked", () => {
    const items = flattenQueue(
      {
        allowed: true,
        doctype: "New Branch Details",
        sections: [
          {
            rows: [
              {
                name: "NBI/09102026/GL-Testing/6",
                proposed_branch_request_id: "NBO/South/Mysore/6",
                workflow_state: "Assigned to ZIBP for Branch Proposal",
              },
            ],
          },
        ],
      },
      "Zonal Infra Business Partner",
    );
    expect(items[0]).toMatchObject({
      doctype: "Proposed Branch Details",
      name: "NBO/South/Mysore/6",
      request_id: "NBO/South/Mysore/6",
      property_id: "NBI/09102026/GL-Testing/6",
    });
  });

  it("reads doctype blocks (HO Infra Legal) and maps old state labels", () => {
    const items = flattenQueue(
      {
        allowed: true,
        doctypes: [
          { doctype: "BAZ Vendor Code Creation", sections: [{ rows: [{ name: "BAZ/1", workflow_state: "Assigned for BAZ Vendor Code Creation" }] }] },
          { doctype: "Proposed Branch Details", sections: [{ rows: [{ name: "NBO/2", workflow_state: "Assigned to Approval Manager 2" }] }] },
        ],
      },
      "HO Infra Legal Team",
    );
    expect(items.map((item) => item.doctype)).toEqual(["BAZ Vendor Code Creation", "Proposed Branch Details"]);
    expect(items[1].workflow_state_label).toBe("Assigned to Infra Head");
  });

  it("ignores Business Team MIS allocation rows but keeps its query queue", () => {
    const items = flattenQueue(
      {
        allowed: true,
        rows: [{ name: "MIS-GL", product_line: "GL" }],
        query_queue: { doctype: "Query Log Details", rows: [{ name: "QL/1", workflow_state: "Query In Progress" }] },
      },
      "Business Team",
    );
    expect(items).toHaveLength(1);
    expect(items[0].doctype).toBe("Query Log Details");
  });
});
