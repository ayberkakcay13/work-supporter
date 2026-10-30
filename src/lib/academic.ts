// Akademik takvim işaretleri (2026-2027 Güz). Takvimde sabit olarak gösterilir.
export const ACADEMIC_MARKERS: { title: string; start: string; end?: string; allDay: boolean }[] = [
  { title: "Dersten çekilme (W) son günü, 16:00", start: "2026-11-20", allDay: true },
  { title: "Derslerin son günü", start: "2026-12-11", allDay: true },
  // Bitiş günü takvimde dahil değildir; 31 Aralık'ı kapsamak için 1 Ocak verilir.
  { title: "Proje/Sunum dönemi", start: "2026-12-14", end: "2027-01-01", allDay: true },
];
