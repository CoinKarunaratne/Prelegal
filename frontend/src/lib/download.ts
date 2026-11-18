import type { NdaValues } from "./nda/values";

/** Save a blob as a file via a temporary link. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** e.g. "Mutual-NDA-Acme-Inc-Globex-Corp.pdf" */
export function pdfFileName({ party1, party2 }: NdaValues): string {
  const slug = (s: string) =>
    s
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "");
  const parties = [party1.company, party2.company].map(slug).filter(Boolean);
  return ["Mutual-NDA", ...parties].join("-") + ".pdf";
}
