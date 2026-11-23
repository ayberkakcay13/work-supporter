"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { periodLabel, shiftPeriod } from "@/lib/todos";
import type { Goal } from "@/lib/goals";
import {
  COURSE_COLORS,
  mergeCourses,
  normCode,
  orderBetween,
  sortCards,
  UNKNOWN_COURSE_COLOR,
  type Course,
  type CourseRow,
  type WeekCard,
} from "@/lib/week";

// Haftalık plan tahtası. Kartlar sürükle-bırak ile günlere konur; değişiklikler iyimser:
// ekran hemen güncellenir, kayıt tarayıcıdaki Supabase istemcisiyle arka planda gider.

type Drag = { kind: "course"; code: string } | { kind: "card"; id: string };
type CardDraft = { id: string | null; day: string; course_code: string; topic: string; time: string; done: boolean };
type Result = PromiseLike<{ error: { message: string } | null }>;

const weekHref = (d: string) => `/hedefler?sekme=plan&hafta=${d}`;
const DRAG_TYPE = "application/x-hafta-plani";

export function WeekBoard({
  weekStart,
  today,
  goals,
  initialRows,
  initialCards,
  suggestions,
}: {
  weekStart: string;
  today: string;
  goals: Pick<Goal, "title" | "course_code" | "color">[];
  initialRows: CourseRow[];
  initialCards: WeekCard[];
  // Ders koduna göre konu önerileri (hedeflerdeki konular).
  suggestions: Record<string, string[]>;
}) {
  const [rows, setRows] = useState(initialRows);
  const [cards, setCards] = useState(initialCards);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<CardDraft | null>(null);
  const [courseForm, setCourseForm] = useState<Course | "new" | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const courses = useMemo(() => mergeCourses(goals, rows), [goals, rows]);
  const courseByCode = useMemo(() => new Map(courses.map((c) => [c.code, c])), [courses]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftPeriod("day", weekStart, i)), [weekStart]);
  const thisWeek = days.includes(today);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function persist(run: () => Result, rollback: () => void, what: string) {
    try {
      const { error } = await run();
      if (error) throw new Error(error.message);
    } catch (e) {
      rollback();
      setToast(`${what}: ${e instanceof Error ? e.message : "bir hata oluştu"}`);
    }
  }

  const dayCards = (day: string) => sortCards(cards.filter((c) => c.day === day));
  const endOrder = (day: string, except?: string) => {
    const list = dayCards(day).filter((c) => c.id !== except);
    return orderBetween(list.at(-1)?.sort_order, undefined);
  };

  // --- kartlar -------------------------------------------------------------

  function addCard(card: Omit<WeekCard, "id" | "done">) {
    const row: WeekCard = { ...card, id: crypto.randomUUID(), done: false };
    const prev = cards;
    setCards([...cards, row]);
    void persist(() => createClient().from("week_cards").insert(row), () => setCards(prev), "Kart eklenemedi");
  }

  function updateCard(id: string, patch: Partial<Omit<WeekCard, "id">>) {
    const prev = cards;
    setCards(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    void persist(
      () => createClient().from("week_cards").update(patch).eq("id", id),
      () => setCards(prev),
      "Kaydedilemedi",
    );
  }

  function deleteCard(id: string) {
    const prev = cards;
    setCards(cards.filter((c) => c.id !== id));
    void persist(() => createClient().from("week_cards").delete().eq("id", id), () => setCards(prev), "Silinemedi");
  }

  // Kartı gündeki komşusuyla yer değiştirir (telefonda sürüklemek yerine).
  function moveCard(id: string, dir: -1 | 1) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const list = dayCards(card.day);
    const i = list.findIndex((c) => c.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    // Hedef komşunun öbür yanına yerleştir.
    const order = dir === -1 ? orderBetween(list[j - 1]?.sort_order, list[j].sort_order) : orderBetween(list[j].sort_order, list[j + 1]?.sort_order);
    updateCard(id, { sort_order: order });
  }

  // index: gündeki görünen sıradaki boşluk (0 = en üst).
  function dropAt(day: string, index: number | null) {
    const drag = dragging;
    setDragging(null);
    setOver(null);
    if (!drag) return;
    const shown = dayCards(day);
    const draggedId = drag.kind === "card" ? drag.id : null;
    let order: number;
    if (index === null) {
      order = endOrder(day, draggedId ?? undefined);
    } else {
      const before = shown.slice(0, index).filter((c) => c.id !== draggedId).at(-1);
      const after = shown.slice(index).find((c) => c.id !== draggedId);
      order = orderBetween(before?.sort_order, after?.sort_order);
    }
    if (drag.kind === "course") {
      addCard({ day, course_code: drag.code, topic: null, time: null, sort_order: order });
    } else {
      const card = cards.find((c) => c.id === drag.id);
      if (card && (card.day !== day || card.sort_order !== order)) updateCard(card.id, { day, sort_order: order });
    }
  }

  function saveDraft(d: CardDraft) {
    const values = {
      day: d.day,
      course_code: d.course_code,
      topic: d.topic.trim() || null,
      time: d.time || null,
      done: d.done,
    };
    if (d.id === null) {
      addCard({ ...values, sort_order: endOrder(d.day) });
    } else {
      const old = cards.find((c) => c.id === d.id);
      const moved = old && old.day !== d.day;
      updateCard(d.id, moved ? { ...values, sort_order: endOrder(d.day, d.id) } : values);
    }
  }

  // --- dersler -------------------------------------------------------------

  function saveCourse(row: CourseRow) {
    const prev = rows;
    setRows([...rows.filter((r) => normCode(r.code) !== row.code), row]);
    void persist(
      () => createClient().from("courses").upsert(row, { onConflict: "user_id,code" }),
      () => setRows(prev),
      "Ders kaydedilemedi",
    );
  }

  function deleteCourse(code: string) {
    const prev = rows;
    setRows(rows.filter((r) => normCode(r.code) !== code));
    void persist(() => createClient().from("courses").delete().eq("code", code), () => setRows(prev), "Ders silinemedi");
  }

  // --- sürükle-bırak -------------------------------------------------------

  const startDrag = (e: React.DragEvent, drag: Drag) => {
    e.dataTransfer.setData(DRAG_TYPE, "1");
    e.dataTransfer.effectAllowed = drag.kind === "course" ? "copy" : "move";
    setDragging(drag);
  };
  const dropProps = (key: string, day: string, index: number | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
      if (over !== key) setOver(key);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropAt(day, index);
    },
  });

  const colorOf = (code: string) => courseByCode.get(code)?.color ?? UNKNOWN_COURSE_COLOR;
  const newDraft = (code: string): CardDraft => ({
    id: null,
    day: thisWeek ? today : weekStart,
    course_code: code,
    topic: "",
    time: "",
    done: false,
  });

  return (
    <div className="space-y-4">
      {toast && (
        <div
          role="alert"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg md:bottom-4"
        >
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={weekHref(shiftPeriod("week", weekStart, -1))} className="btn-secondary px-3" aria-label="Önceki hafta">
            ‹
          </Link>
          <span className="min-w-44 text-center text-sm font-medium">{periodLabel("week", weekStart)}</span>
          <Link href={weekHref(shiftPeriod("week", weekStart, 1))} className="btn-secondary px-3" aria-label="Sonraki hafta">
            ›
          </Link>
          {!thisWeek && (
            <Link href="/hedefler?sekme=plan" className="btn-ghost">
              Bu hafta
            </Link>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={() => setEditing(newDraft(courses[0]?.code ?? ""))}
          disabled={courses.length === 0}
        >
          + Oluştur
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
        {/* Ders kartları */}
        <aside className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Dersler</p>
          <div className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
            {courses.map((c) => (
              <div
                key={c.code}
                draggable
                onDragStart={(e) => startDrag(e, { kind: "course", code: c.code })}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                className="group relative cursor-grab rounded-md border border-l-4 border-zinc-200 bg-white px-2 py-1.5 text-xs active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900"
                style={{ borderLeftColor: c.color }}
              >
                <button
                  type="button"
                  className="block w-full pr-5 text-left"
                  title="Bu dersten kart oluştur"
                  onClick={() => setEditing(newDraft(c.code))}
                >
                  <span className="block font-semibold">{c.code}</span>
                  {c.name && <span className="block truncate text-zinc-500 dark:text-zinc-400">{c.name}</span>}
                </button>
                <button
                  type="button"
                  aria-label={`${c.code} dersini düzenle`}
                  className="absolute right-1 top-1 rounded px-1 text-zinc-400 hover:text-zinc-800 can-hover:opacity-0 can-hover:group-hover:opacity-100 dark:hover:text-zinc-200"
                  onClick={() => setCourseForm(c)}
                >
                  ✎
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-md border border-dashed border-zinc-300 px-2 py-1.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => setCourseForm("new")}
            >
              + Kart ekle
            </button>
          </div>
        </aside>

        {/* Günler */}
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((day) => {
            const list = dayCards(day);
            const isToday = day === today;
            return (
              <section
                key={day}
                {...dropProps(`${day}:end`, day, null)}
                className={`flex min-h-24 flex-col rounded-xl border p-1.5 md:min-h-72 ${
                  isToday
                    ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/5"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
                } ${over === `${day}:end` ? "ring-2 ring-indigo-400" : ""}`}
              >
                <h3
                  className={`mb-1 px-1 text-xs font-medium capitalize ${
                    isToday ? "text-indigo-600 dark:text-indigo-300" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {format(parseISO(day), "EEE d", { locale: tr })}
                </h3>
                {list.map((card, i) => (
                  <div key={card.id}>
                    <Gap active={over === `${day}:${i}`} dragging={!!dragging} {...dropProps(`${day}:${i}`, day, i)} />
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => startDrag(e, { kind: "card", id: card.id })}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onClick={() =>
                        setEditing({
                          id: card.id,
                          day: card.day,
                          course_code: card.course_code,
                          topic: card.topic ?? "",
                          time: card.time ?? "",
                          done: card.done,
                        })
                      }
                      className={`block w-full cursor-grab rounded-md border-l-4 px-2 py-1.5 text-left text-xs active:cursor-grabbing ${
                        card.done ? "opacity-50" : ""
                      } ${dragging?.kind === "card" && dragging.id === card.id ? "opacity-40" : ""}`}
                      style={{ borderLeftColor: colorOf(card.course_code), backgroundColor: `${colorOf(card.course_code)}1f` }}
                    >
                      <span className={`block font-semibold ${card.done ? "line-through" : ""}`}>
                        {card.time && <span className="mr-1 font-normal tabular-nums text-zinc-500 dark:text-zinc-400">{card.time}</span>}
                        {card.done && "✓ "}
                        {card.course_code}
                      </span>
                      {card.topic && <span className="block break-words text-zinc-600 dark:text-zinc-300">{card.topic}</span>}
                    </button>
                  </div>
                ))}
                <Gap
                  last
                  empty={list.length === 0}
                  active={over === `${day}:${list.length}`}
                  dragging={!!dragging}
                  {...dropProps(`${day}:${list.length}`, day, list.length)}
                />
              </section>
            );
          })}
        </div>
      </div>

      {courses.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Henüz ders yok. Soldan “+ Kart ekle” ile bir ders ekleyebilirsin; hedeflerdeki ders kodları da burada otomatik çıkar.
        </p>
      )}

      {editing && (
        <CardDialog
          draft={editing}
          courses={courses}
          suggestions={suggestions[editing.course_code] ?? []}
          onClose={() => setEditing(null)}
          onSave={saveDraft}
          onDelete={editing.id ? () => deleteCard(editing.id!) : undefined}
          onMove={editing.id ? (dir) => moveCard(editing.id!, dir) : undefined}
          onCourseChange={(code) => setEditing({ ...editing, course_code: code })}
        />
      )}

      {courseForm && (
        <CourseDialog
          course={courseForm === "new" ? null : courseForm}
          existing={courses.map((c) => c.code)}
          onClose={() => setCourseForm(null)}
          onSave={saveCourse}
          onDelete={deleteCourse}
        />
      )}
    </div>
  );
}

// Kartların arasındaki bırakma boşluğu.
function Gap({
  active,
  dragging,
  last,
  empty,
  ...drop
}: {
  active: boolean;
  dragging: boolean;
  last?: boolean;
  empty?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      {...drop}
      className={`rounded-md border border-dashed transition-colors ${
        empty ? "min-h-16 flex-1" : last ? "min-h-6 flex-1" : "my-1 h-4"
      } ${
        active
          ? "border-indigo-400 bg-indigo-100/60 dark:bg-indigo-500/15"
          : dragging
            ? "border-indigo-300 dark:border-indigo-500/50"
            : "border-zinc-300 dark:border-zinc-700"
      } ${last && !empty ? "mt-1" : ""}`}
    />
  );
}

function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    // showModal odağı ilk alana taşır; istenen alana geri ver.
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);
  return {
    ref,
    close: () => ref.current?.close(),
    props: {
      ref,
      onClose,
      className:
        "m-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
    },
  };
}

function CardDialog({
  draft,
  courses,
  suggestions,
  onClose,
  onSave,
  onDelete,
  onMove,
  onCourseChange,
}: {
  draft: CardDraft;
  courses: Course[];
  suggestions: string[];
  onClose: () => void;
  onSave: (d: CardDraft) => void;
  onDelete?: () => void;
  onMove?: (dir: -1 | 1) => void;
  onCourseChange: (code: string) => void;
}) {
  const modal = useModal(onClose);
  const [topic, setTopic] = useState(draft.topic);
  const [day, setDay] = useState(draft.day);
  const [time, setTime] = useState(draft.time);
  const [done, setDone] = useState(draft.done);
  const known = courses.some((c) => c.code === draft.course_code);

  return (
    <dialog {...modal.props}>
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.course_code || !day) return;
          onSave({ ...draft, topic, day, time, done });
          modal.close();
        }}
      >
        <h2 className="text-lg font-semibold">{draft.id ? "Kartı düzenle" : "Yeni kart"}</h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Ders</span>
          <select className="input" value={draft.course_code} onChange={(e) => onCourseChange(e.target.value)} required>
            {!known && <option value={draft.course_code}>{draft.course_code || "Seç"}</option>}
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
                {c.name ? ` — ${c.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Konu</span>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            list="hafta-konu-onerileri"
            placeholder="Heaps, proje raporu…"
            data-autofocus
          />
          <datalist id="hafta-konu-onerileri">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Gün</span>
            <input type="date" className="input" value={day} onChange={(e) => setDay(e.target.value)} required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Saat <span className="font-normal text-zinc-500 dark:text-zinc-400">(isteğe bağlı)</span>
            </span>
            <div className="flex gap-1">
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              {time && (
                <button type="button" className="btn-ghost" aria-label="Saati kaldır" onClick={() => setTime("")}>
                  ✕
                </button>
              )}
            </div>
          </label>
        </div>

        {draft.id && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="h-4 w-4" />
              Tamamlandı
            </label>
            {onMove && (
              <div className="flex gap-1">
                <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => onMove(-1)}>
                  ↑ Yukarı
                </button>
                <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => onMove(1)}>
                  ↓ Aşağı
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            {onDelete && (
              <button
                type="button"
                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                onClick={() => {
                  onDelete();
                  modal.close();
                }}
              >
                Sil
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={modal.close}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary">
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function CourseDialog({
  course,
  existing,
  onClose,
  onSave,
  onDelete,
}: {
  course: Course | null;
  existing: string[];
  onClose: () => void;
  onSave: (row: CourseRow) => void;
  onDelete: (code: string) => void;
}) {
  const modal = useModal(onClose);
  const [code, setCode] = useState(course?.code ?? "");
  const [name, setName] = useState(course?.name ?? "");
  const [color, setColor] = useState(course?.color ?? COURSE_COLORS[existing.length % COURSE_COLORS.length]);
  const [error, setError] = useState<string | null>(null);

  return (
    <dialog {...modal.props}>
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const c = normCode(code);
          if (!c) return setError("Ders kodu gir.");
          if (!course && existing.includes(c)) return setError("Bu ders zaten var.");
          onSave({ code: c, name: name.trim() || null, color });
          modal.close();
        }}
      >
        <h2 className="text-lg font-semibold">{course ? "Dersi düzenle" : "Yeni ders kartı"}</h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Ders kodu</span>
          <input
            className="input"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="COMP 400"
            disabled={!!course}
            required
            data-autofocus={course ? undefined : true}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Ad</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Network"
            data-autofocus={course ? true : undefined}
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium">Renk</span>
          <div className="flex flex-wrap gap-2">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ${
                  color === c ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {course?.fromGoal && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Bu ders hedeflerindeki ders kodundan geliyor.</p>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <div>
            {course?.stored && (
              <button
                type="button"
                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                onClick={() => {
                  onDelete(course.code);
                  modal.close();
                }}
              >
                {course.fromGoal ? "Varsayılana dön" : "Sil"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={modal.close}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary">
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
