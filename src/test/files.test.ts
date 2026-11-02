import { frappeFileUrl } from "@/lib/files";

const dmsid = "bb7a18fa-7e9d-49cb-98ed-5d677dbb4f8d";
const origin = "https://uatimcore26.chola.murugappa.com";
const getFile = `${origin}/api/method/infra_ms.controllers.file.controller.GET_File`;

describe("frappeFileUrl", () => {
  it("turns a DMS id into the infra_ms GET_File URL on the Frappe host", () => {
    expect(frappeFileUrl(dmsid, "Abdullampurmet Dep Tiltile DEED.pdf", origin)).toBe(
      `${getFile}?dmsid=${dmsid}&file_name=Abdullampurmet+Dep+Tiltile+DEED.pdf&Preview=No`,
    );
  });

  it("rewrites a legacy GET_File URL to the relative DMS handler on the SPA origin", () => {
    const stored = `http://uatimcore26/api/v2/method/frappe.core.doctype.file.controller.GET_File?dmsid=${dmsid}&file_name=old.pdf`;
    expect(frappeFileUrl(stored, undefined, origin)).toBe(`${getFile}?dmsid=${dmsid}&file_name=old.pdf&Preview=No`);
  });

  it("leaves a local Frappe file path on the Frappe origin", () => {
    expect(frappeFileUrl("/private/files/note.pdf", undefined, origin)).toBe(`${origin}/private/files/note.pdf`);
  });
});
