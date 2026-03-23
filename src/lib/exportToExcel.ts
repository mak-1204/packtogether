/**
 * @fileOverview Utility to export trip data to an Excel file.
 * Uses dynamic imports to ensure compatibility with Next.js SSR and the browser environment.
 */

export async function exportTripToExcel(
  trip: any,
  itineraryItems: any[],
  members: any[]
) {
  // Dynamically import libraries to avoid SSR issues
  const XLSX = await import("xlsx");
  const fileSaver = await import("file-saver");
  const saveAs = fileSaver.saveAs || (fileSaver as any).default;

  const workbook = XLSX.utils.book_new();

  // ─────────────────────────────
  // SHEET 1 — Trip Overview
  // ─────────────────────────────
  const overviewData = [
    ["PACKTOGETHER — TRIP EXPORT", ""],
    ["", ""],
    ["Trip Name", trip.name],
    ["Destination", trip.destination],
    ["Start Date", trip.startDate?.toDate
      ? trip.startDate.toDate().toDateString()
      : new Date(trip.startDate).toDateString()],
    ["End Date", trip.endDate?.toDate
      ? trip.endDate.toDate().toDateString()
      : new Date(trip.endDate).toDateString()],
    ["Vibe", trip.vibe],
    ["Budget Per Head", `₹${trip.budgetPerHead}`],
    ["Total Members", members.length],
    ["", ""],
    ["MEMBERS", ""],
    ...members.map(m => [m.name, m.email || m.role]),
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet["!cols"] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Trip Overview");

  // ─────────────────────────────
  // SHEET 2 — Itinerary & Budget
  // ─────────────────────────────
  const itineraryHeader = [
    "Day",
    "Item Name",
    "Category",
    "Planned Budget (₹)",
    "Actual Budget (₹)",
    "Difference (₹)",
    "Notes",
  ];

  const itineraryRows = itineraryItems.map(item => [
    `Day ${item.dayNumber}`,
    item.name,
    item.category || item.mode || "-",
    Number(item.plannedBudget) || 0,
    Number(item.actualBudget) || 0,
    (Number(item.plannedBudget) || 0) - (Number(item.actualBudget) || 0),
    item.notes || "-",
  ]);

  const totalPlanned = itineraryItems.reduce(
    (sum, i) => sum + (Number(i.plannedBudget) || 0), 0
  );
  const totalActual = itineraryItems.reduce(
    (sum, i) => sum + (Number(i.actualBudget) || 0), 0
  );

  const itineraryData = [
    itineraryHeader,
    ...itineraryRows,
    ["", "", "", "", "", "", ""],
    ["TOTAL", "", "", totalPlanned, totalActual, totalPlanned - totalActual, ""],
  ];

  const itinerarySheet = XLSX.utils.aoa_to_sheet(itineraryData);
  itinerarySheet["!cols"] = [
    { wch: 8 }, { wch: 25 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, itinerarySheet, "Itinerary & Budget");

  // ─────────────────────────────
  // SHEET 3 — Pre-trip Checklist
  // ─────────────────────────────
  const checklistHeader = [
    "Item Name", "Category", "Day", "Checklist Item", "Status"
  ];

  const checklistRows: any[] = [];
  itineraryItems
    .filter(item => item.checklist && item.checklist.length > 0)
    .forEach(item => {
      item.checklist.forEach((check: any) => {
        checklistRows.push([
          item.name,
          item.category || item.mode || "-",
          `Day ${item.dayNumber}`,
          check.item,
          check.status === "green" ? "Done"
            : check.status === "yellow" ? "Pending"
            : "Todo",
        ]);
      });
    });

  const checklistData = [checklistHeader, ...checklistRows];
  const checklistSheet = XLSX.utils.aoa_to_sheet(checklistData);
  checklistSheet["!cols"] = [
    { wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 35 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, checklistSheet, "Pre-trip Checklist");

  // ─────────────────────────────
  // SHEET 4 — Budget by Category
  // ─────────────────────────────
  const categories = [
    "stay", "food", "local transit", "activity",
    "journey", "train", "flight", "bus", "roadtrip", "cab"
  ];

  const categoryRows = categories
    .map(cat => {
      const items = itineraryItems.filter(i =>
        (i.category || i.mode || "").toLowerCase() === cat
      );
      if (items.length === 0) return null;
      const planned = items.reduce((sum, i) => sum + (Number(i.plannedBudget) || 0), 0);
      const actual = items.reduce((sum, i) => sum + (Number(i.actualBudget) || 0), 0);
      return [
        cat.charAt(0).toUpperCase() + cat.slice(1),
        planned,
        actual,
        planned - actual,
      ];
    })
    .filter(Boolean);

  const summaryData = [
    ["Category", "Planned (₹)", "Actual (₹)", "Difference (₹)"],
    ...categoryRows,
    ["", "", "", ""],
    ["TOTAL", totalPlanned, totalActual, totalPlanned - totalActual],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Budget Summary");

  // ─────────────────────────────
  // SAVE FILE
  // ─────────────────────────────
  const fileName = `${trip.name.replace(/\s+/g, "_")}_PackTogether.xlsx`;
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, fileName);
}
