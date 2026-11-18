import { renderToBuffer } from "@react-pdf/renderer";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fillTemplate } from "@/lib/nda/fill";
import { loadNdaTemplate } from "@/lib/nda/template";
import { defaultValues } from "@/lib/nda/values";
import { NdaPdf, registerPdfFonts } from "./NdaPdf";

describe("NdaPdf", () => {
  it("renders the filled-in NDA, including non-Latin names, to a multi-page PDF", async () => {
    registerPdfFonts(path.join(process.cwd(), "public", "fonts"));
    const { coverPage, standardTerms } = loadNdaTemplate();
    const values = {
      ...defaultValues,
      effectiveDate: "2026-11-18",
      governingLaw: "Delaware",
      party1: { company: "Acme Inc.", name: "Łukasz Żółć", title: "CEO", noticeAddress: "a.very.long.email.address.for.notices@acme-incorporated.test" },
      party2: { company: "Москва ООО", name: "Αθηνά Παππά", title: "CTO", noticeAddress: "athena@example.test" },
    };
    const buffer = await renderToBuffer(<NdaPdf coverPage={fillTemplate(coverPage, values)} standardTerms={standardTerms} />);
    if (process.env.NDA_PDF_OUT) writeFileSync(process.env.NDA_PDF_OUT, buffer);

    const pdf = buffer.toString("latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(Number(pdf.match(/\/Type \/Pages[\s\S]*?\/Count (\d+)/)?.[1])).toBeGreaterThanOrEqual(2);
  }, 30_000);
});
