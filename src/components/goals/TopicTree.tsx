"use client";

import { useState } from "react";
import { formatInTimeZone } from "@/lib/dates";
import { topicStatus, type TopicNode, type TopicStatus } from "@/lib/goals";
import { addTopic, deleteTopic, setTopicDone, updateTopic } from "@/app/(app)/hedefler/actions";
import { useAction } from "@/components/useAction";

const STATUS_STYLES: Record<TopicStatus, string> = {
  bekliyor: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "zamanında tamamlandı": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "geç tamamlandı": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "gecikti (not bekliyor)": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "gecikti (notlu)": "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

function formatDue(date: string) {
  // "yyyy-MM-dd" gün olarak gösterilir; öğlen alınarak saat dilimi kayması önlenir.
  return formatInTimeZone(new Date(`${date}T12:00:00+03:00`), "d MMM EEE");
}

export function TopicTree({ nodes, goalId, today }: { nodes: TopicNode[]; goalId: string; today: string }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <TopicItem key={node.id} node={node} goalId={goalId} today={today} />
      ))}
    </ul>
  );
}

function TopicItem({ node, goalId, today }: { node: TopicNode; goalId: string; today: string }) {
  const [mode, setMode] = useState<"view" | "edit" | "add" | "reschedule">("view");
  const { pending, error, run } = useAction();
  const status = topicStatus(node, today);
  const done = node.completed_at !== null;
  const needsNote = status === "gecikti (not bekliyor)";
  const overdue = needsNote || status === "gecikti (notlu)";

  return (
    <li>
      <div className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
          checked={done}
          disabled={pending || needsNote}
          title={needsNote ? "Önce gecikme notunu yaz" : undefined}
          onChange={(e) => run(() => setTopicDone(node.id, e.target.checked))}
        />

        {mode === "edit" ? (
          <EditTopicForm node={node} onDone={() => setMode("view")} />
        ) : (
          <>
            <span className={done ? "text-zinc-400 line-through dark:text-zinc-500" : ""}>{node.title}</span>
            {node.due_date && <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDue(node.due_date)}</span>}
            {node.due_date && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[status]}`}>{status}</span>
            )}
            <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button className="btn-ghost" onClick={() => setMode("add")}>
                + Alt başlık
              </button>
              <button className="btn-ghost" onClick={() => setMode("edit")}>
                Düzenle
              </button>
              <button
                className="btn-ghost text-red-600 dark:text-red-400"
                onClick={() => {
                  const extra = node.children.length > 0 ? " Alt başlıkları da silinecek." : "";
                  if (confirm(`"${node.title}" silinsin mi?${extra}`)) run(() => deleteTopic(node.id));
                }}
              >
                Sil
              </button>
            </span>
          </>
        )}
      </div>

      {error && <p className="ml-9 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {needsNote && <MissNoteForm node={node} />}

      {overdue && !needsNote && (
        <div className="ml-9 space-y-1 pb-1 text-sm">
          <p className="text-zinc-500 dark:text-zinc-400">
            <span className="font-medium">Gecikme notu:</span> {node.miss_note}
          </p>
          {mode === "reschedule" ? (
            <RescheduleForm node={node} today={today} onDone={() => setMode("view")} />
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bitirdiysen kutuyu işaretle ya da{" "}
              <button className="text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setMode("reschedule")}>
                yeni tarih ver
              </button>
              .
            </p>
          )}
        </div>
      )}

      {(node.children.length > 0 || mode === "add") && (
        <div className="ml-6 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          <TopicTree nodes={node.children} goalId={goalId} today={today} />
          {mode === "add" && (
            <AddTopicForm goalId={goalId} parentId={node.id} placeholder="Yeni alt başlık" autoFocus onDone={() => setMode("view")} />
          )}
        </div>
      )}
    </li>
  );
}

export function AddTopicForm({
  goalId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  goalId: string;
  parentId: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const { pending, error, run } = useAction();

  return (
    <form
      className="flex flex-wrap items-center gap-2 px-2 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addTopic(goalId, parentId, title, due || null),
          () => {
            setTitle("");
            setDue("");
            onDone?.();
          },
        );
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={(e) => e.key === "Escape" && onDone?.()}
        className="input max-w-xs py-1.5"
      />
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        title="Tamamlama tarihi"
        className="input w-auto py-1.5"
      />
      <button type="submit" className="btn-secondary py-1.5" disabled={pending || !title.trim()}>
        Ekle
      </button>
      {onDone && (
        <button type="button" className="btn-ghost" onClick={onDone}>
          Vazgeç
        </button>
      )}
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function EditTopicForm({ node, onDone }: { node: TopicNode; onDone: () => void }) {
  const [title, setTitle] = useState(node.title);
  const [due, setDue] = useState(node.due_date ?? "");
  const { pending, error, run } = useAction();

  return (
    <form
      className="flex flex-1 flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateTopic(node.id, { title: title.trim(), due_date: due || null }), onDone);
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        className="input max-w-xs py-1.5"
      />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input w-auto py-1.5" />
      <button type="submit" className="btn-secondary py-1.5" disabled={pending}>
        Kaydet
      </button>
      <button type="button" className="btn-ghost" onClick={onDone}>
        Vazgeç
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function MissNoteForm({ node }: { node: TopicNode }) {
  const [note, setNote] = useState("");
  const { pending, error, run } = useAction();

  return (
    <form
      className="ml-9 space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-500/30 dark:bg-red-500/5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateTopic(node.id, { miss_note: note.trim() }));
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">Bu konu neden yetişmedi?</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input" />
      </label>
      <button type="submit" className="btn-primary py-1.5" disabled={pending || !note.trim()}>
        Notu kaydet
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function RescheduleForm({ node, today, onDone }: { node: TopicNode; today: string; onDone: () => void }) {
  const [due, setDue] = useState("");
  const { pending, error, run } = useAction();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateTopic(node.id, { due_date: due }), onDone);
      }}
    >
      <input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} className="input w-auto py-1.5" />
      <button type="submit" className="btn-secondary py-1.5" disabled={pending || !due}>
        Tarihi güncelle
      </button>
      <button type="button" className="btn-ghost" onClick={onDone}>
        Vazgeç
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
