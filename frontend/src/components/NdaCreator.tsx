"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadBlob, pdfFileName } from "@/lib/download";
import { fillTemplate } from "@/lib/nda/fill";
import type { NdaTemplate } from "@/lib/nda/template";
import { defaultValues, todayIso, unsupportedPdfCharacters, type NdaValues } from "@/lib/nda/values";
import { NdaForm } from "./NdaForm";
import { NdaPreview } from "./NdaPreview";

export function NdaCreator({ template }: { template: NdaTemplate }) {
  const [values, setValues] = useState<NdaValues>(defaultValues);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the Effective Date to today. This runs after hydration because the
  // page is prerendered at build time, when "today" is not the visitor's today.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => (v.effectiveDate ? v : { ...v, effectiveDate: todayIso() }));
  }, []);

  // Only the cover page has placeholders; the Standard Terms are used as-is.
  const coverPage = useMemo(() => fillTemplate(template.coverPage, values), [template, values]);
  const standardTerms = template.standardTerms;
  const unsupported = useMemo(() => unsupportedPdfCharacters(values), [values]);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const [{ pdf }, { NdaPdf, registerPdfFonts }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./NdaPdf"),
      ]);
      registerPdfFonts(`${window.location.origin}/fonts`);
      const blob = await pdf(<NdaPdf coverPage={coverPage} standardTerms={standardTerms} />).toBlob();
      downloadBlob(blob, pdfFileName(values));
    } catch (err) {
      console.error(err);
      setError("Sorry, the PDF could not be created. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const download = (wide?: boolean) => (
    <DownloadButton onClick={downloadPdf} busy={downloading} disabled={unsupported.length > 0} wide={wide} />
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">Prelegal</p>
            <h1 className="text-lg font-semibold text-stone-900">Mutual NDA Creator</h1>
          </div>
          {download()}
        </div>
        {error && (
          <p role="alert" className="bg-red-50 px-4 py-2 text-center text-sm text-red-800">
            {error}
          </p>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(340px,420px)_1fr] lg:items-start">
        <section
          aria-labelledby="form-heading"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto"
        >
          <h2 id="form-heading" className="text-base font-semibold text-stone-900">
            Agreement details
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            The document preview updates as you type. Leave a field blank to fill it in by hand later.
          </p>
          <NdaForm values={values} onChange={setValues} />
          <div className="mt-8 space-y-3 border-t border-stone-200 pt-5">
            <div role="status">
              {unsupported.length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                  The PDF can&apos;t show these characters yet:{" "}
                  <span className="font-semibold">{unsupported.slice(0, 8).join(" ")}</span>. It supports Latin,
                  Greek and Cyrillic text. Please remove them to download.
                </p>
              )}
            </div>
            {download(true)}
          </div>
        </section>

        <section aria-labelledby="preview-heading" className="min-w-0">
          <h2 id="preview-heading" className="sr-only">
            Document preview
          </h2>
          <div className="rounded-sm bg-white px-5 py-10 shadow-md ring-1 ring-stone-200 sm:px-12 sm:py-14">
            <NdaPreview coverPage={coverPage} standardTerms={standardTerms} />
          </div>
          <p className="mt-4 text-center text-xs text-stone-500">
            Based on the Common Paper Mutual NDA (Version 1.0), used under{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Not legal advice.
          </p>
        </section>
      </main>
    </div>
  );
}

function DownloadButton({
  onClick,
  busy,
  disabled,
  wide,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-wait ${wide ? "w-full" : ""}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.69L6.28 8.47a.75.75 0 0 0-1.06 1.06l4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 1 0-1.06-1.06l-2.97 2.97V2.75Z" />
        <path d="M3.5 13.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
      </svg>
      {busy ? "Preparing PDF…" : "Download PDF"}
    </button>
  );
}
