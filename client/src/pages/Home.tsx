// @ts-nocheck
/**
 * Design Philosophy: Pacific Northwest editorial utility.
 * Preserve the provided proposal-like aesthetic, financing workflow, and print-first close-sheet behavior.
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useState, useMemo } from "react";

/**

- Northwest Artisan Windows — In-Home Sales Tool
- Built for life in the Northwest.
- 
- Two views sharing one state object:
- 1. Calculator (rep-facing)
- 1. Close Sheet (homeowner-facing, prints/downloads to one US Letter page)
- 
- Shared state. No backend. Reset clears everything.
- Download PDF exports the close sheet as a true one-page PDF that preserves the on-screen layout.
- 
- EDIT POINTS (all at the top of this file):
- - Brand colors: FOREST, BRONZE, CREAM
- - APRs: APR_LOW, APR_HIGH
- - Discount: DISCOUNT_DEFAULT, DISCOUNT_MAX
- - Terms: TERM_OPTIONS
- - Rebates: REBATE_WINDOW, REBATE_SLIDER
- - All customer-facing copy in the CONFIG block below
    */

// ───────────── Brand ─────────────
const FOREST = "#2F4F3E";
const FOREST_DEEP = "#1F3A2C";
const BRONZE = "#9C7A3F";
const BRONZE_SOFT = "#C9A96E";
const CREAM = "#FAF6EE";
const IVORY = "#F5EFE2";

// ───────────── Config (edit here) ─────────────
const DISCOUNT_DEFAULT = 4;
const DISCOUNT_MAX = 10;
const TERM_OPTIONS = [60, 84, 120];
const TERM_DEFAULT = 84;
const APR_LOW = 0.0674;
const APR_HIGH = 0.2094;

const REBATE_WINDOW = 225;
const REBATE_SLIDER = 600;

const COMPETITOR_NAME_SUGGESTIONS = ["Andersen", "Pella", "Marvin", "DaBella"];

const BRAND_NAME = "Northwest Artisan Windows";
const TAGLINE = "Built for life in the Northwest.";
const HEADLINE = "A clear, transparent view of your project—simple and easy to understand.";

const VALUE_PROPS = [
"Full install in 2–3 days",
"Full Avista rebate coordination included",
"$0 Down Financing Available",
"Locally Owned & Operated",
"Best Price Guarantee",
];

const WHATS_INCLUDED = [
"ClimaTech PriME® triple-pane windows",
"Lifetime warranty",
"82–86% noise reduction",
"30–45% energy savings",
"Professional measurement and installation",
"Full tear-out and haul-away",
];

const SAME_DAY_INCENTIVE_TITLE = "Sign Today, Get Trim On Us";
const SAME_DAY_INCENTIVE_BODY =
"Lock your project in today and we'll include interior OR exterior trim work at no additional cost — applies whether you pay in full (cash, check, or card) or finance through LightStream.";

const CLOSING_LINE = "Sign today and we can start measurements this week.";

const DISCLAIMER_FINANCE =
"Financing estimates based on LightStream home improvement loan APR range of 6.74%–20.94% with AutoPay. Rates without AutoPay are 0.50 percentage points higher. Final rate and terms depend on credit profile and application.";

const DISCLAIMER_REBATE =
"Avista rebate amounts shown reflect current program levels ($225/window, $600/sliding glass door). Final rebate is determined and paid by Avista; we prepare and submit all paperwork on your behalf.";

// ───────────── Helpers ─────────────
const pmt = (annualRate, months, principal) => {
const r = annualRate / 12;
if (r === 0) return principal / months;
return (principal * r) / (1 - Math.pow(1 + r, -months));
};

const fmtUSD = (n) => {
if (n === null || n === undefined || !isFinite(n)) return "—";
return new Intl.NumberFormat("en-US", {
style: "currency",
currency: "USD",
maximumFractionDigits: 0,
}).format(Math.round(n));
};

const todayISO = () => {
const d = new Date();
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (iso) => {
if (!iso) return "";
const [y, m, d] = iso.split("-").map(Number);
const dt = new Date(y, m - 1, d);
return dt.toLocaleDateString("en-US", {
month: "long",
day: "numeric",
year: "numeric",
});
};

const parseCurrency = (raw) => {
if (raw === "" || raw === null || raw === undefined) return null;
const cleaned = String(raw).replace(/[^0-9.]/g, "");
if (cleaned === "") return null;
const n = parseFloat(cleaned);
return isFinite(n) ? n : null;
};

const parseInt0 = (raw) => {
if (raw === "" || raw === null || raw === undefined) return null;
const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
return isFinite(n) ? n : null;
};

// ───────────── Initial State ─────────────
const initialState = {
customerName: "",
projectDate: todayISO(),
numWindows: "",
numSliders: "",
projectTotal: "",
installAdders: "",
discountPct: String(DISCOUNT_DEFAULT),
termMonths: TERM_DEFAULT,
competitors: [
{ name: "", quote: "" },
{ name: "", quote: "" },
{ name: "", quote: "" },
],
competitorsOpen: false,
includeTrimIncentive: true,
};

// ───────────── Root ─────────────
export default function Home() {
const [view, setView] = useState("calc");
const [state, setState] = useState(initialState);

const derived = useMemo(() => {
const windows = parseInt0(state.numWindows);
const sliders = parseInt0(state.numSliders) ?? 0;
const project = parseCurrency(state.projectTotal);
const adders = parseCurrency(state.installAdders) ?? 0;
const discount = parseFloat(state.discountPct);
const discountSafe =
isFinite(discount) && discount >= 0 && discount <= DISCOUNT_MAX
? discount
: DISCOUNT_DEFAULT;

const hasProject = project !== null && project > 0;
const finalTotal = hasProject ? project + adders : null;
const totalOpenings = (windows ?? 0) + sliders;

const rebateTotal =
  (windows ?? 0) * REBATE_WINDOW + sliders * REBATE_SLIDER;

const payInFullSavings = hasProject ? finalTotal * (discountSafe / 100) : null;
const payInFullTotal = hasProject ? finalTotal - payInFullSavings : null;

const afterRebateFinanced = hasProject ? finalTotal - rebateTotal : null;
const afterRebatePayInFull = hasProject ? payInFullTotal - rebateTotal : null;

const paymentLow = hasProject ? pmt(APR_LOW, state.termMonths, finalTotal) : null;
const paymentHigh = hasProject ? pmt(APR_HIGH, state.termMonths, finalTotal) : null;

const competitorRows = state.competitors
  .map((c, i) => {
    const q = parseCurrency(c.quote);
    if (q === null || q <= 0) return null;
    const savings = finalTotal !== null ? q - finalTotal : null;
    return {
      i,
      name: c.name.trim() || `Competitor ${i + 1}`,
      quote: q,
      savings,
      lower: finalTotal !== null && q < finalTotal,
    };
  })
  .filter(Boolean);

return {
  hasProject,
  windows,
  sliders,
  totalOpenings,
  finalTotal,
  rebateTotal,
  payInFullSavings,
  payInFullTotal,
  afterRebateFinanced,
  afterRebatePayInFull,
  paymentLow,
  paymentHigh,
  competitorRows,
};

}, [state]);

const updateField = (k, v) => setState((s) => ({ ...s, [k]: v }));
const updateCompetitor = (idx, key, v) =>
setState((s) => ({
...s,
competitors: s.competitors.map((c, i) =>
i === idx ? { ...c, [key]: v } : c
),
}));

const reset = () => {
if (confirm("Reset all fields for next customer?")) {
setState({ ...initialState, projectDate: todayISO() });
setView("calc");
}
};

const renderExportCanvas = async (target: HTMLElement, scale: number) => {
const width = Math.round(target.getBoundingClientRect().width);
const height = Math.round(target.getBoundingClientRect().height);

return html2canvas(target, {
  scale,
  backgroundColor: CREAM,
  useCORS: true,
  logging: false,
  width,
  height,
  windowWidth: width,
  windowHeight: height,
  scrollX: 0,
  scrollY: -window.scrollY,
  onclone: (clonedDocument) => {
    const clonedTarget = clonedDocument.getElementById("close-sheet-page") as HTMLElement | null;
    if (!clonedTarget) return;

    clonedTarget.style.width = "8.5in";
    clonedTarget.style.height = "11in";
    clonedTarget.style.minHeight = "11in";
    clonedTarget.style.boxSizing = "border-box";
    clonedTarget.style.overflow = "hidden";
    clonedTarget.style.background = CREAM;
    clonedTarget.style.setProperty("-webkit-print-color-adjust", "exact");
    clonedTarget.style.setProperty("print-color-adjust", "exact");

    const sourceNodes = [target, ...Array.from(target.querySelectorAll("*"))] as HTMLElement[];
    const clonedNodes = [clonedTarget, ...Array.from(clonedTarget.querySelectorAll("*"))] as HTMLElement[];

    clonedNodes.forEach((node, index) => {
      if (!(node instanceof clonedDocument.defaultView!.HTMLElement)) return;
      const sourceNode = sourceNodes[index];
      node.style.setProperty("-webkit-print-color-adjust", "exact");
      node.style.setProperty("print-color-adjust", "exact");
      if (!sourceNode) return;

      const computed = window.getComputedStyle(sourceNode);
      const computedCssText =
        computed.cssText ||
        Array.from(computed)
          .map((prop) => `${prop}: ${computed.getPropertyValue(prop)};`)
          .join(" ");

      node.style.cssText = `${computedCssText}; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;
      node.removeAttribute("class");
    });

    clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
      node.parentNode?.removeChild(node);
    });
  },
});
};

const triggerFileDownload = (blob: Blob, filename: string) => {
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
a.target = "_blank";
a.rel = "noopener";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);

setTimeout(() => {
  URL.revokeObjectURL(url);
}, 30000);

return url;
};

const downloadPDF = async () => {
const safeName =
(state.customerName || "Customer").replace(/[^a-z0-9]+/gi, "_") || "Customer";
const filename = `NAW--.pdf`;

const target = document.getElementById("close-sheet-page");
if (!target) return;

try {
  const canvas = await renderExportCanvas(target, 3);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
    compress: true,
  });

  pdf.addImage(imgData, "PNG", 0, 0, 8.5, 11, undefined, "FAST");
  const blob = pdf.output("blob");
  const url = triggerFileDownload(blob, filename);

  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
} catch (error) {
  console.error("PDF export failed", error);
  window.alert("PDF export failed. Please try Save as Image, or refresh and try again.");
}
};

const downloadImage = async () => {
const safeName =
(state.customerName || "Customer").replace(/[^a-z0-9]+/gi, "_") || "Customer";
const filename = `NAW--.png`;

const target = document.getElementById("close-sheet-page");
if (!target) return;

try {
  const canvas = await renderExportCanvas(target, 2);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = triggerFileDownload(blob, filename);

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, "image/png");
} catch (error) {
  console.error("Image export failed", error);
  window.alert("Image export failed. Please refresh and try again.");
}
};

return (
<div
className="min-h-screen text-stone-900"
style={{
background: IVORY,
fontFamily: "'Avenir Next', 'Segoe UI', Arial, sans-serif",
}}
>
<style>{`
    .font-display {
      font-family: Georgia, 'Times New Roman', serif;
      letter-spacing: 0.01em;
    }
    .tabular { font-variant-numeric: tabular-nums; }
    .tracked-caps {
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 10px;
      font-weight: 600;
    }

    @media print {
      @page { size: letter portrait; margin: 0.6in; }
      html, body { background: white !important; }
      .no-print { display: none !important; }
      .print-page {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: none !important;
        background: white !important;
      }
    }
  `}</style>

  {view === "calc" ? (
    <Calculator
      state={state}
      derived={derived}
      updateField={updateField}
      updateCompetitor={updateCompetitor}
      onGenerate={() => setView("sheet")}
      onReset={reset}
    />
  ) : (
    <CloseSheet
      state={state}
      derived={derived}
      onBack={() => setView("calc")}
      onDownload={downloadPDF}
      onDownloadImage={downloadImage}
    />
  )}
</div>

);
}

// ───────────── Brand Mark ─────────────
function BrandMark({ size = 48 }) {
return (
<svg width={size} height={size} viewBox="0 0 48 48" fill="none">
<path
d="M8 44 L8 24 Q8 8 24 8 Q40 8 40 24 L40 44 Z"
stroke={BRONZE}
strokeWidth="1.5"
fill="none"
/>
<path d="M10 38 L18 26 L24 32 L30 22 L38 38 Z" fill={FOREST} />
<path d="M12 38 L14 30 L16 38 Z" fill={FOREST_DEEP} />
<path d="M15 38 L18 28 L21 38 Z" fill={FOREST_DEEP} />
<path d="M28 38 L31 29 L34 38 Z" fill={FOREST_DEEP} />
<path d="M33 38 L36 31 L39 38 Z" fill={FOREST_DEEP} />
<line x1="8" y1="44" x2="40" y2="44" stroke={BRONZE} strokeWidth="1.5" />
</svg>
);
}

function Wordmark({ compact = false }) {
return (
<div className="flex items-center gap-3">
<BrandMark size={compact ? 36 : 44} />
<div>
<div
className="font-display leading-none"
style={{
fontSize: compact ? "15px" : "18px",
fontWeight: 600,
color: FOREST_DEEP,
letterSpacing: "0.08em",
}}
>
NORTHWEST ARTISAN
</div>
<div
className="flex items-center gap-2 mt-1"
style={{ color: BRONZE }}
>
<span style={{ flex: 1, height: 1, background: BRONZE, opacity: 0.6 }} />
<span
className="font-display"
style={{
fontSize: compact ? "10px" : "11px",
letterSpacing: "0.3em",
fontWeight: 600,
}}
>
WINDOWS
</span>
<span style={{ flex: 1, height: 1, background: BRONZE, opacity: 0.6 }} />
</div>
</div>
</div>
);
}

// ───────────── Calculator ─────────────
function Calculator({
state,
derived,
updateField,
updateCompetitor,
onGenerate,
onReset,
}) {
const [discountError, setDiscountError] = useState("");

const handleDiscount = (v) => {
if (v === "") {
setDiscountError("");
updateField("discountPct", "");
return;
}
const n = parseFloat(v);
if (isFinite(n) && n > DISCOUNT_MAX) {
setDiscountError(`Discount capped at ${DISCOUNT_MAX}%.`);
updateField("discountPct", String(DISCOUNT_MAX));
return;
}
setDiscountError("");
updateField("discountPct", v);
};

const canGenerate = derived.hasProject;

return (
<div className="max-w-7xl mx-auto px-6 py-8">
<div
className="flex items-center justify-between mb-8 pb-6"
style={{ borderBottom: `1px solid ${BRONZE_SOFT}` }}
>
<Wordmark />
<button
onClick={onReset}
className="text-sm hover:opacity-70 transition-opacity"
style={{ color: FOREST_DEEP }}
>
Reset
</button>
</div>

  <div className="grid lg:grid-cols-5 gap-8">
    {/* Inputs */}
    <div className="lg:col-span-3 space-y-8">
      <Section title="Customer">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextInput
            label="Customer Name"
            value={state.customerName}
            onChange={(v) => updateField("customerName", v)}
            placeholder="Homeowner name"
          />
          <DateInput
            label="Project Date"
            value={state.projectDate}
            onChange={(v) => updateField("projectDate", v)}
          />
        </div>
      </Section>

      <Section title="Project">
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberInput
            label="Number of Windows"
            value={state.numWindows}
            onChange={(v) =>
              updateField("numWindows", v.replace(/[^0-9]/g, ""))
            }
            placeholder="0"
          />
          <NumberInput
            label="Sliding Glass Doors"
            value={state.numSliders}
            onChange={(v) =>
              updateField("numSliders", v.replace(/[^0-9]/g, ""))
            }
            placeholder="0"
          />
          <CurrencyInput
            label="Project Total"
            value={state.projectTotal}
            onChange={(v) => updateField("projectTotal", v)}
          />
          <CurrencyInput
            label="Install Adders (optional)"
            value={state.installAdders}
            onChange={(v) => updateField("installAdders", v)}
          />
          <div>
            <Label>Pay-in-Full Discount (%)</Label>
            <input
              type="number"
              min="0"
              max={DISCOUNT_MAX}
              step="0.5"
              value={state.discountPct}
              onChange={(e) => handleDiscount(e.target.value)}
              className="w-full px-4 py-3 bg-white border rounded-md outline-none text-lg tabular"
              style={{ borderColor: BRONZE_SOFT }}
            />
            {discountError && (
              <p className="text-xs text-red-700 mt-1">{discountError}</p>
            )}
          </div>
          <div className="flex items-end">
            <label
              className="flex items-center gap-3 text-sm cursor-pointer"
              style={{ color: FOREST_DEEP }}
            >
              <input
                type="checkbox"
                checked={state.includeTrimIncentive}
                onChange={(e) =>
                  updateField("includeTrimIncentive", e.target.checked)
                }
                className="w-4 h-4"
              />
              <span>Include same-day trim incentive</span>
            </label>
          </div>
        </div>

        {derived.rebateTotal > 0 && (
          <div
            className="mt-4 px-4 py-3 rounded-md text-sm flex items-center justify-between"
            style={{
              background: CREAM,
              color: FOREST_DEEP,
              border: `1px solid ${BRONZE_SOFT}`,
            }}
          >
            <span>
              <strong>Avista rebate:</strong>{" "}
              {derived.windows ?? 0} window
              {(derived.windows ?? 0) === 1 ? "" : "s"} × $225
              {derived.sliders > 0 &&
                ` + ${derived.sliders} slider${
                  derived.sliders === 1 ? "" : "s"
                } × $600`}
            </span>
            <span className="tabular font-semibold">
              {fmtUSD(derived.rebateTotal)}
            </span>
          </div>
        )}
      </Section>

      <Section title="Financing Term">
        <div className="grid grid-cols-3 gap-3">
          {TERM_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => updateField("termMonths", t)}
              className="py-5 rounded-md border text-lg font-medium transition-all tabular"
              style={
                state.termMonths === t
                  ? {
                      background: FOREST,
                      color: "white",
                      borderColor: FOREST,
                    }
                  : {
                      background: "white",
                      color: FOREST_DEEP,
                      borderColor: BRONZE_SOFT,
                    }
              }
            >
              {t} months
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <button
          onClick={() =>
            updateField("competitorsOpen", !state.competitorsOpen)
          }
          className="w-full flex items-center justify-between py-3 text-left group"
        >
          <div>
            <div className="tracked-caps" style={{ color: BRONZE }}>
              Optional
            </div>
            <div
              className="text-base font-medium mt-0.5"
              style={{ color: FOREST_DEEP }}
            >
              Real Competitor Quotes
            </div>
          </div>
          <span className="text-xl" style={{ color: BRONZE }}>
            {state.competitorsOpen ? "−" : "+"}
          </span>
        </button>
        {state.competitorsOpen && (
          <div className="mt-3 space-y-3">
            <p
              className="text-xs italic"
              style={{ color: FOREST_DEEP, opacity: 0.7 }}
            >
              Only enter quotes the homeowner has actually received.
            </p>
            {state.competitors.map((c, i) => (
              <div key={i} className="grid grid-cols-5 gap-3 items-end">
                <div className="col-span-3">
                  <Label>Company {i + 1}</Label>
                  <input
                    type="text"
                    list="competitor-names"
                    value={c.name}
                    onChange={(e) =>
                      updateCompetitor(i, "name", e.target.value)
                    }
                    placeholder="e.g., Andersen"
                    className="w-full px-4 py-3 bg-white border rounded-md outline-none"
                    style={{ borderColor: BRONZE_SOFT }}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Their Quote</Label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      c.quote === ""
                        ? ""
                        : new Intl.NumberFormat("en-US").format(
                            parseCurrency(c.quote) ?? 0
                          )
                    }
                    onChange={(e) =>
                      updateCompetitor(
                        i,
                        "quote",
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="$"
                    className="w-full px-4 py-3 bg-white border rounded-md outline-none tabular"
                    style={{ borderColor: BRONZE_SOFT }}
                  />
                </div>
              </div>
            ))}
            <datalist id="competitor-names">
              {COMPETITOR_NAME_SUGGESTIONS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        )}
      </Section>
    </div>

    {/* Outputs */}
    <div className="lg:col-span-2">
      <div
        className="sticky top-6 rounded-lg p-6"
        style={{
          background: "white",
          border: `1px solid ${BRONZE_SOFT}`,
          boxShadow: "0 1px 3px rgba(47,79,62,0.06)",
        }}
      >
        <div className="tracked-caps mb-4" style={{ color: BRONZE }}>
          Summary
        </div>

        {!derived.hasProject ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: FOREST_DEEP, opacity: 0.5 }}
          >
            Enter project total to see pricing.
          </div>
        ) : (
          <>
            <OutputRow
              label="Final Project Total"
              value={fmtUSD(derived.finalTotal)}
              emphasize
            />

            {derived.rebateTotal > 0 && (
              <OutputRow
                label="Avista rebate"
                value={fmtUSD(derived.rebateTotal)}
                accent
                small
              />
            )}

            <div
              className="h-px my-4"
              style={{ background: BRONZE_SOFT, opacity: 0.5 }}
            />

            <OutputRow
              label="Pay-in-full savings"
              value={fmtUSD(derived.payInFullSavings)}
              small
            />
            <OutputRow
              label="Pay-in-Full Total"
              value={fmtUSD(derived.payInFullTotal)}
              emphasize
              accent
            />

            <div
              className="h-px my-4"
              style={{ background: BRONZE_SOFT, opacity: 0.5 }}
            />

            <div>
              <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
                Estimated monthly payment
              </div>
              <div
                className="font-display tabular"
                style={{
                  fontSize: "30px",
                  fontWeight: 600,
                  color: FOREST_DEEP,
                  lineHeight: 1.1,
                }}
              >
                {fmtUSD(derived.paymentLow)} – {fmtUSD(derived.paymentHigh)}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: FOREST_DEEP, opacity: 0.6 }}
              >
                {state.termMonths}-month term · LightStream est.
              </div>
            </div>

            {derived.competitorRows.length > 0 && (
              <>
                <div
                  className="h-px my-4"
                  style={{ background: BRONZE_SOFT, opacity: 0.5 }}
                />
                <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
                  Savings vs. their quotes
                </div>
                {derived.competitorRows.map((r) => (
                  <div
                    key={r.i}
                    className="flex justify-between items-baseline py-1.5 text-sm"
                  >
                    <span style={{ color: FOREST_DEEP }}>{r.name}</span>
                    {r.lower ? (
                      <span
                        className="italic text-xs"
                        style={{ color: FOREST_DEEP, opacity: 0.5 }}
                      >
                        Their quote is lower
                      </span>
                    ) : (
                      <span
                        className="tabular font-medium"
                        style={{ color: FOREST_DEEP }}
                      >
                        {fmtUSD(r.savings)}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            <p
              className="text-[10px] leading-snug mt-5 pt-4"
              style={{
                color: FOREST_DEEP,
                opacity: 0.6,
                borderTop: `1px solid ${BRONZE_SOFT}`,
              }}
            >
              {DISCLAIMER_FINANCE}
            </p>
          </>
        )}

        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="w-full mt-6 py-4 rounded-md text-base font-medium transition-all"
          style={
            canGenerate
              ? {
                  background: FOREST,
                  color: "white",
                  boxShadow: "0 1px 3px rgba(47,79,62,0.15)",
                }
              : {
                  background: "#e7e5e4",
                  color: "#a8a29e",
                  cursor: "not-allowed",
                }
          }
        >
          Generate Close Sheet →
        </button>
      </div>
    </div>
  </div>
</div>

);
}

// ───────────── Close Sheet ─────────────
function CloseSheet({ state, derived, onBack, onDownload, onDownloadImage }) {
const competitorsToShow = derived.competitorRows.filter((r) => !r.lower);
const [imgLoading, setImgLoading] = useState(false);

const handleImageClick = async () => {
setImgLoading(true);
try {
await onDownloadImage();
} finally {
setImgLoading(false);
}
};

return (
<div style={{ background: IVORY, minHeight: "100vh" }}>
<div className="no-print max-w-[8.5in] mx-auto flex items-center justify-between px-4 py-4 gap-3">
<button
onClick={onBack}
className="text-sm hover:opacity-70"
style={{ color: FOREST_DEEP }}
>
← Back
</button>
<div className="flex gap-2">
<button
onClick={handleImageClick}
disabled={imgLoading}
className="px-4 py-2.5 rounded-md text-sm font-medium transition-opacity flex items-center gap-2"
style={{
background: "white",
color: FOREST_DEEP,
border: `1px solid ${BRONZE_SOFT}`,
opacity: imgLoading ? 0.6 : 1,
}}
>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
<rect
x="2"
y="3"
width="12"
height="10"
rx="1"
stroke="currentColor"
strokeWidth="1.5"
/>
<circle cx="6" cy="7" r="1" fill="currentColor" />
<path
d="M2 11l3-3 3 3 2-2 4 4"
stroke="currentColor"
strokeWidth="1.5"
strokeLinecap="round"
strokeLinejoin="round"
/>
</svg>
{imgLoading ? "Saving..." : "Save as Image"}
</button>
<button
onClick={onDownload}
className="px-4 py-2.5 rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2"
style={{ background: FOREST, color: "white" }}
>
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
<path
d="M8 2v8m0 0l-3-3m3 3l3-3M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1"
stroke="currentColor"
strokeWidth="1.5"
strokeLinecap="round"
strokeLinejoin="round"
/>
</svg>
Download PDF
</button>
</div>
</div>

  <div
    id="close-sheet-page"
    className="print-page mx-auto"
    style={{
      width: "8.5in",
      minHeight: "11in",
      padding: "0.6in",
      background: CREAM,
      color: FOREST_DEEP,
      fontFamily: "'Avenir Next', 'Segoe UI', Arial, sans-serif",
      position: "relative",
      boxShadow: "0 4px 20px rgba(47,79,62,0.08)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: "0.35in",
        border: `1px solid ${BRONZE}`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: "0.4in",
        border: `0.5px solid ${BRONZE_SOFT}`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "1.8in",
        height: "1.8in",
        background: FOREST,
        clipPath: "polygon(0 100%, 100% 100%, 0 0)",
        opacity: 0.9,
      }}
    />

    {/* Top-right corner: customer name + date */}
    <div
      className="tabular"
      style={{
        position: "absolute",
        top: "0.5in",
        right: "0.55in",
        fontSize: "10px",
        color: FOREST_DEEP,
        opacity: 0.7,
        textAlign: "right",
        lineHeight: 1.4,
        zIndex: 2,
      }}
    >
      {state.customerName && (
        <div style={{ fontWeight: 500 }}>{state.customerName}</div>
      )}
      <div>{fmtDate(state.projectDate)}</div>
    </div>

    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Brand header */}
      <div className="text-center mb-5">
        <div className="flex justify-center mb-2">
          <BrandMark size={52} />
        </div>
        <div
          className="font-display"
          style={{
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: FOREST_DEEP,
          }}
        >
          NORTHWEST ARTISAN
        </div>
        <div
          className="flex items-center justify-center gap-3 mt-1"
          style={{ color: BRONZE }}
        >
          <span style={{ width: "40px", height: 1, background: BRONZE }} />
          <span
            className="font-display"
            style={{
              fontSize: "12px",
              letterSpacing: "0.4em",
              fontWeight: 600,
            }}
          >
            WINDOWS
          </span>
          <span style={{ width: "40px", height: 1, background: BRONZE }} />
        </div>
        <div
          className="font-display italic mt-2"
          style={{
            fontSize: "13px",
            color: BRONZE,
            letterSpacing: "0.02em",
          }}
        >
          {TAGLINE}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: BRONZE_SOFT,
          margin: "0 0 18px",
        }}
      />

      <div className="mb-5">
        <h1
          className="font-display"
          style={{
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.005em",
            lineHeight: 1.15,
            color: FOREST_DEEP,
          }}
        >
          {HEADLINE}
        </h1>
      </div>

      <p
        className="mb-5"
        style={{ fontSize: "11px", color: FOREST_DEEP, opacity: 0.75 }}
      >
        Prepared for {state.customerName || "you"}
        {derived.windows
          ? ` · ${derived.windows} window${derived.windows === 1 ? "" : "s"}`
          : ""}
        {derived.sliders > 0
          ? ` · ${derived.sliders} sliding glass door${
              derived.sliders === 1 ? "" : "s"
            }`
          : ""}
      </p>

      {/* Project Investment band */}
      <div
        className="grid grid-cols-2 mb-5"
        style={{
          border: `1.5px solid ${BRONZE}`,
          background: "white",
        }}
      >
        <div
          className="p-4"
          style={{ borderRight: `1px solid ${BRONZE_SOFT}` }}
        >
          <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
            Project Total
          </div>
          <div
            className="font-display tabular"
            style={{
              fontSize: "38px",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: FOREST_DEEP,
            }}
          >
            {fmtUSD(derived.finalTotal)}
          </div>
          <div
            className="mt-2"
            style={{ fontSize: "10px", color: FOREST_DEEP, opacity: 0.7 }}
          >
            {derived.totalOpenings} opening
            {derived.totalOpenings === 1 ? "" : "s"} · fully installed
          </div>
        </div>
        <div className="p-4">
          <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
            Pay in Full &amp; Save
          </div>
          <div
            className="font-display tabular"
            style={{
              fontSize: "30px",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: FOREST_DEEP,
            }}
          >
            {fmtUSD(derived.payInFullTotal)}
          </div>
          <div
            className="mt-2"
            style={{ fontSize: "10px", color: FOREST_DEEP, opacity: 0.7 }}
          >
            You save {fmtUSD(derived.payInFullSavings)}
          </div>
        </div>
      </div>

      {/* Avista rebate */}
      {derived.rebateTotal > 0 && (
        <div
          className="mb-5 p-4 grid grid-cols-3 gap-4"
          style={{
            background: "white",
            border: `1px solid ${BRONZE_SOFT}`,
          }}
        >
          <div>
            <div className="tracked-caps mb-1" style={{ color: BRONZE }}>
              Avista Rebate
            </div>
            <div
              className="font-display tabular"
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: FOREST,
              }}
            >
              {fmtUSD(derived.rebateTotal)}
            </div>
            <div
              className="mt-1"
              style={{ fontSize: "9px", color: FOREST_DEEP, opacity: 0.7 }}
            >
              {derived.windows ?? 0} × $225
              {derived.sliders > 0 && ` + ${derived.sliders} × $600`}
            </div>
          </div>
          <div>
            <div className="tracked-caps mb-1" style={{ color: BRONZE }}>
              After Rebate · Financed
            </div>
            <div
              className="font-display tabular"
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: FOREST_DEEP,
              }}
            >
              {fmtUSD(derived.afterRebateFinanced)}
            </div>
          </div>
          <div>
            <div className="tracked-caps mb-1" style={{ color: BRONZE }}>
              After Rebate · Pay in Full
            </div>
            <div
              className="font-display tabular"
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: FOREST,
              }}
            >
              {fmtUSD(derived.afterRebatePayInFull)}
            </div>
          </div>
        </div>
      )}

      {/* Monthly payment */}
      <div className="mb-5">
        <div className="tracked-caps mb-1" style={{ color: BRONZE }}>
          Monthly Payment Option
        </div>
        <div
          className="font-display tabular"
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: FOREST_DEEP,
            letterSpacing: "-0.01em",
          }}
        >
          {fmtUSD(derived.paymentLow)} – {fmtUSD(derived.paymentHigh)} / month
        </div>
        <div
          className="mt-1"
          style={{ fontSize: "10px", color: FOREST_DEEP, opacity: 0.7 }}
        >
          {state.termMonths}-month term · LightStream home improvement loan
          (estimate)
        </div>
      </div>

      {/* Why + What's Included */}
      <div className="grid grid-cols-2 gap-6 mb-5">
        <div>
          <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
            Why Northwest Artisan
          </div>
          <ul className="space-y-1" style={{ fontSize: "10.5px", lineHeight: 1.55 }}>
            {VALUE_PROPS.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: BRONZE }}>◆</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
            What's Included
          </div>
          <ul className="space-y-1" style={{ fontSize: "10.5px", lineHeight: 1.55 }}>
            {WHATS_INCLUDED.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: BRONZE }}>◆</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Same-day incentive */}
      {state.includeTrimIncentive && (
        <div
          className="mb-5 p-4"
          style={{
            background: FOREST,
            color: CREAM,
            borderLeft: `3px solid ${BRONZE}`,
          }}
        >
          <div
            className="font-display mb-1"
            style={{
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: BRONZE_SOFT,
            }}
          >
            {SAME_DAY_INCENTIVE_TITLE}
          </div>
          <div style={{ fontSize: "10.5px", lineHeight: 1.55 }}>
            {SAME_DAY_INCENTIVE_BODY}
          </div>
        </div>
      )}

      {/* Competitor comparison */}
      {competitorsToShow.length > 0 && (
        <div className="mb-5">
          <div className="tracked-caps mb-2" style={{ color: BRONZE }}>
            Your Quotes Compared
          </div>
          <table className="w-full" style={{ fontSize: "11px" }}>
            <thead>
              <tr
                className="text-left"
                style={{
                  color: FOREST_DEEP,
                  opacity: 0.7,
                  borderBottom: `1px solid ${BRONZE_SOFT}`,
                }}
              >
                <th className="py-2 font-medium">Company</th>
                <th className="py-2 font-medium text-right tabular">
                  Their Quote
                </th>
                <th className="py-2 font-medium text-right tabular">
                  You Save With Us
                </th>
              </tr>
            </thead>
            <tbody>
              {competitorsToShow.map((r) => (
                <tr
                  key={r.i}
                  style={{ borderBottom: `0.5px solid ${BRONZE_SOFT}` }}
                >
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right tabular">
                    {fmtUSD(r.quote)}
                  </td>
                  <td
                    className="py-2 text-right tabular font-semibold"
                    style={{ color: FOREST }}
                  >
                    {fmtUSD(r.savings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Closing line */}
      <div className="mb-5">
        <p
          className="font-display"
          style={{
            fontSize: "15px",
            fontWeight: 500,
            display: "inline-block",
            borderBottom: `1.5px solid ${BRONZE}`,
            paddingBottom: "3px",
            color: FOREST_DEEP,
          }}
        >
          {CLOSING_LINE}
        </p>
      </div>

      {/* Footer */}
      <div
        className="pt-3 space-y-1"
        style={{
          fontSize: "8px",
          lineHeight: 1.5,
          color: FOREST_DEEP,
          opacity: 0.65,
          borderTop: `1px solid ${BRONZE_SOFT}`,
        }}
      >
        <p>{DISCLAIMER_FINANCE}</p>
        <p>{DISCLAIMER_REBATE}</p>
        <p className="pt-1" style={{ fontWeight: 500 }}>
          www.northwest-artisan-windows.com
        </p>
      </div>
    </div>
  </div>

  <div className="h-8 no-print" />
</div>

);
}

// ───────────── UI Primitives ─────────────
function Section({ title, children }) {
return (
<div>
{title && (
<div className="tracked-caps mb-3" style={{ color: BRONZE }}>
{title}
</div>
)}
{children}
</div>
);
}

function Label({ children }) {
return (
<label
className="block text-xs mb-1.5 font-medium"
style={{ color: FOREST_DEEP, opacity: 0.75 }}
>
{children}
</label>
);
}

function TextInput({ label, value, onChange, placeholder }) {
return (
<div>
<Label>{label}</Label>
<input
type="text"
value={value}
onChange={(e) => onChange(e.target.value)}
placeholder={placeholder}
className="w-full px-4 py-3 bg-white border rounded-md outline-none"
style={{ borderColor: BRONZE_SOFT }}
/>
</div>
);
}

function DateInput({ label, value, onChange }) {
return (
<div>
<Label>{label}</Label>
<input
type="date"
value={value}
onChange={(e) => onChange(e.target.value)}
className="w-full px-4 py-3 bg-white border rounded-md outline-none tabular"
style={{ borderColor: BRONZE_SOFT }}
/>
</div>
);
}

function NumberInput({ label, value, onChange, placeholder }) {
return (
<div>
<Label>{label}</Label>
<input
type="text"
inputMode="numeric"
value={value}
onChange={(e) => onChange(e.target.value)}
placeholder={placeholder}
className="w-full px-4 py-3 bg-white border rounded-md outline-none text-lg tabular"
style={{ borderColor: BRONZE_SOFT }}
/>
</div>
);
}

function CurrencyInput({ label, value, onChange }) {
const display =
value === "" || value === null
? ""
: new Intl.NumberFormat("en-US").format(parseCurrency(value) ?? 0);
return (
<div>
<Label>{label}</Label>
<div className="relative">
<span
className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
style={{ color: FOREST_DEEP, opacity: 0.5 }}
>
$
</span>
<input
type="text"
inputMode="numeric"
value={display}
onChange={(e) =>
onChange(e.target.value.replace(/[^0-9]/g, ""))
}
placeholder="0"
className="w-full pl-8 pr-4 py-3 bg-white border rounded-md outline-none text-lg tabular"
style={{ borderColor: BRONZE_SOFT }}
/>
</div>
</div>
);
}

function OutputRow({ label, value, hint, emphasize, accent, small }) {
return (
<div className="flex justify-between items-baseline py-1.5">
<div>
<div
style={{
fontSize: emphasize ? "13px" : "11px",
color: FOREST_DEEP,
opacity: emphasize ? 0.85 : 0.65,
}}
>
{label}
</div>
{hint && (
<div
className="mt-0.5"
style={{ fontSize: "10px", color: FOREST_DEEP, opacity: 0.5 }}
>
{hint}
</div>
)}
</div>
<div
className="tabular"
style={
emphasize
? {
fontFamily: "'Cormorant Garamond', serif",
fontSize: "26px",
fontWeight: 600,
color: accent ? FOREST : FOREST_DEEP,
}
: small
? { fontSize: "13px", color: accent ? FOREST : FOREST_DEEP }
: {
fontSize: "17px",
fontWeight: 500,
color: accent ? FOREST : FOREST_DEEP,
}
}
>
{value}
</div>
</div>
);
}
