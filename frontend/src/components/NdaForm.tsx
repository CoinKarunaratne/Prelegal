"use client";

import { useId, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { NdaValues, Party } from "@/lib/nda/values";

type Props = {
  values: NdaValues;
  onChange: Dispatch<SetStateAction<NdaValues>>;
};

const inputClass =
  "mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-xs placeholder:text-stone-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-hidden";

export function NdaForm({ values, onChange }: Props) {
  const set = <K extends keyof NdaValues>(key: K, value: NdaValues[K]) =>
    onChange((v) => ({ ...v, [key]: value }));

  return (
    <form className="mt-6 space-y-8" onSubmit={(e) => e.preventDefault()}>
      <Section legend="Terms">
        <TextField
          label="Purpose"
          hint="How Confidential Information may be used"
          multiline
          value={values.purpose}
          onChange={(v) => set("purpose", v)}
        />
        <TextField
          label="Effective Date"
          type="date"
          value={values.effectiveDate}
          onChange={(v) => set("effectiveDate", v)}
        />
        <TermChoice
          legend="MNDA Term"
          hint="The length of this MNDA"
          value={values.mndaTerm}
          options={[
            { kind: "expires", label: "Expires after a fixed term", hasYears: true },
            { kind: "untilTerminated", label: "Continues until terminated" },
          ]}
          onChange={(v) => set("mndaTerm", v)}
        />
        <TermChoice
          legend="Term of Confidentiality"
          hint="How long Confidential Information is protected"
          value={values.confidentialityTerm}
          options={[
            {
              kind: "years",
              label: "A fixed term (trade secrets stay protected while they remain trade secrets)",
              hasYears: true,
            },
            { kind: "perpetual", label: "In perpetuity" },
          ]}
          onChange={(v) => set("confidentialityTerm", v)}
        />
        <TextField
          label="Governing Law"
          hint="The state whose laws govern the MNDA"
          placeholder="e.g. Delaware"
          value={values.governingLaw}
          onChange={(v) => set("governingLaw", v)}
        />
        <TextField
          label="Jurisdiction"
          hint="City or county and state of the courts"
          placeholder="e.g. courts located in New Castle, DE"
          value={values.jurisdiction}
          onChange={(v) => set("jurisdiction", v)}
        />
        <TextField
          label="MNDA Modifications"
          hint="Optional changes to the Standard Terms"
          multiline
          placeholder="None"
          value={values.modifications}
          onChange={(v) => set("modifications", v)}
        />
      </Section>

      <PartyFields legend="Party 1" party={values.party1} onChange={(p) => set("party1", p)} />
      <PartyFields legend="Party 2" party={values.party2} onChange={(p) => set("party2", p)} />
    </form>
  );
}

function PartyFields({ legend, party, onChange }: { legend: string; party: Party; onChange: (p: Party) => void }) {
  const bind = (key: keyof Party) => ({ value: party[key], onChange: (v: string) => onChange({ ...party, [key]: v }) });
  return (
    <Section legend={legend}>
      <TextField label="Company" autoComplete="organization" {...bind("company")} />
      <TextField label="Signer's name" autoComplete="name" {...bind("name")} />
      <TextField label="Title" autoComplete="organization-title" placeholder="e.g. CEO" {...bind("title")} />
      <TextField label="Notice address" placeholder="Email or postal address" {...bind("noticeAddress")} />
    </Section>
  );
}

function TextField({
  label,
  hint,
  multiline,
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  hint?: string;
  multiline?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const props = {
    id,
    className: inputClass,
    value,
    "aria-describedby": hint ? hintId : undefined,
    ...inputProps,
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea rows={3} {...props} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...props} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function TermChoice<K extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
}: {
  legend: string;
  hint: string;
  value: { kind: K; years: number };
  options: { kind: K; label: string; hasYears?: boolean }[];
  onChange: (value: { kind: K; years: number }) => void;
}) {
  const id = useId();
  const { kind, years } = value;
  return (
    <fieldset aria-describedby={`${id}-hint`}>
      <legend className="text-sm font-medium text-stone-800">{legend}</legend>
      <p id={`${id}-hint`} className="text-xs text-stone-500">
        {hint}
      </p>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <div key={option.kind}>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="radio"
                name={id}
                className="mt-0.5 size-4 accent-teal-700"
                checked={kind === option.kind}
                onChange={() => onChange({ kind: option.kind, years })}
              />
              {option.label}
            </label>
            {option.hasYears && kind === option.kind && (
              <div className="mt-2 ml-6 flex items-center gap-2">
                <input
                  aria-label={`${legend} in years`}
                  aria-describedby={`${id}-years`}
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  className={`${inputClass} mt-0 w-20`}
                  value={Number.isFinite(years) ? years : ""}
                  onChange={(e) => onChange({ kind, years: Math.trunc(e.target.valueAsNumber) })}
                />
                <span id={`${id}-years`} className="text-sm text-stone-700">
                  {years === 1 ? "year" : "years"} from the Effective Date
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-4 w-full border-b border-stone-200 pb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
