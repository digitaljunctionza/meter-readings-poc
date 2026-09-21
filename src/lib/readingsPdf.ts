import type { ReadingRow } from "@/components/ReadingsTable";
import {
  clientStatus,
  formatDay,
  formatDayTime,
  formatNumber,
  isService,
  SERVICE_LABEL,
  SERVICE_UNIT,
  todaySA,
  unitTitle,
} from "@/lib/clientReport";

const NAVY: [number, number, number] = [12, 31, 61];
const GREEN: [number, number, number] = [88, 169, 59];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "property";
}

/**
 * Builds and downloads a readings report as a PDF, entirely in the browser.
 * jsPDF is imported on demand so it never weighs down the dashboard's first
 * load — it only downloads when someone actually asks for a PDF.
 */
export async function downloadReadingsPdf(opts: {
  propertyName: string;
  periodText: string;
  /** Extra filters in words, e.g. 'Unit "101" · Electricity'. */
  filterText: string | null;
  rows: ReadingRow[];
  openIssueIds: Set<string>;
}): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const generated = formatDay(new Date().toISOString());

  // ---- Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 92, "F");

  const logo = await loadImageDataUrl("/icons/icon-192.png");
  let textX = margin;
  if (logo) {
    doc.addImage(logo, "PNG", margin, 18, 56, 56);
    textX = margin + 70;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Meter readings report", textX, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(opts.propertyName, textX, 63);
  doc.setFontSize(9);
  doc.setTextColor(190, 205, 225);
  doc.text(`Wayne's Fix & Finish  |  Generated ${generated}`, textX, 79);

  // ---- What this report covers
  let y = 120;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Period", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(opts.periodText, margin + 60, y);
  if (opts.filterText) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Showing", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(opts.filterText, margin + 60, y);
  }
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Readings", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(opts.rows.length), margin + 60, y);

  // ---- Usage totals per service
  const totals = (["electricity", "water"] as const)
    .map((service) => {
      const used = opts.rows
        .filter((r) => r.service === service && r.usage !== null && r.usage >= 0)
        .reduce((sum, r) => sum + (r.usage ?? 0), 0);
      const count = opts.rows.filter((r) => r.service === service).length;
      return { service, used, count };
    })
    .filter((t) => t.count > 0);

  if (totals.length > 0) {
    y += 22;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Total usage in this report", "Readings", "Used"]],
      body: totals.map((t) => [
        SERVICE_LABEL[t.service],
        String(t.count),
        `${formatNumber(Math.round(t.used * 10) / 10)} ${SERVICE_UNIT[t.service]}`,
      ]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9.5, textColor: INK, cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } },
      headStyles: { fontStyle: "bold", textColor: MUTED, fontSize: 8.5 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" } },
      didDrawCell: (data) => {
        if (data.section === "body") {
          doc.setDrawColor(226, 232, 240);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  } else {
    y += 26;
  }

  // ---- The readings themselves
  const body = opts.rows.map((r) => {
    const known = isService(r.service);
    const unit = known ? SERVICE_UNIT[r.service as "electricity" | "water"] : "";
    const label = known ? SERVICE_LABEL[r.service as "electricity" | "water"] : r.service;
    const used = r.usage !== null && r.usage >= 0 ? `${formatNumber(r.usage)} ${unit}` : "-";
    return [
      formatDayTime(r.captured_at),
      unitTitle(r.unit_number),
      label,
      `${formatNumber(r.reading_value)} ${unit}`,
      used,
      clientStatus(r, opts.openIssueIds.has(r.id)).label,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 50 },
    head: [["Date", "Unit", "Service", "Reading", "Used", "Status"]],
    body,
    styles: { font: "helvetica", fontSize: 8.5, textColor: INK, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.4 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    showHead: "everyPage",
  });

  // ---- Footer on every page
  const pages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1.2);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${opts.propertyName}  |  Meter readings report`, margin, pageHeight - 22);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 22, { align: "right" });
  }

  doc.save(`${slug(opts.propertyName)}-readings-${todaySA()}.pdf`);
}
