// Sayfa yüklenirken tüm ekranı kaplayan bekleme ekranı: düz arka plan, ortada dönen halkanın
// içinde masa başında ders çalışan maymun. Hızlı yüklemelerde hiç görünmesin diye 0,4 sn gecikmeyle (CSS) belirir.
// Animasyonlar globals.css'teki .monkey-* sınıflarında; "hareketi azalt" ayarında durur.

const FUR = "#8b5a2b";
const FACE = "#f0c99b";
const INK = "#27272a";

export function StudyMonkey() {
  return (
    <div className="monkey-appear fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="relative flex h-52 w-52 items-center justify-center">
        {/* maymunun etrafında dönen halka */}
        <svg viewBox="0 0 100 100" className="monkey-spin absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" strokeWidth="3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="70 220"
            className="stroke-indigo-500"
          />
        </svg>
        <svg viewBox="0 0 120 100" className="h-32 w-36" aria-hidden>
          {/* kuyruk */}
          <path
            d="M36 74 C18 76 14 60 22 54 C28 50 32 56 28 60"
            fill="none"
            stroke={FUR}
            strokeWidth="5"
            strokeLinecap="round"
            className="monkey-tail"
          />

          <g className="monkey-bob">
            {/* gövde */}
            <ellipse cx="60" cy="72" rx="22" ry="16" fill={FUR} />
            <ellipse cx="60" cy="75" rx="12" ry="9" fill={FACE} opacity="0.7" />

            {/* kulaklar */}
            <circle cx="38" cy="38" r="8" fill={FUR} />
            <circle cx="38" cy="38" r="4.5" fill={FACE} />
            <circle cx="82" cy="38" r="8" fill={FUR} />
            <circle cx="82" cy="38" r="4.5" fill={FACE} />

            {/* kafa ve yüz */}
            <circle cx="60" cy="40" r="21" fill={FUR} />
            <circle cx="53" cy="37" r="8" fill={FACE} />
            <circle cx="67" cy="37" r="8" fill={FACE} />
            <ellipse cx="60" cy="47" rx="14" ry="10" fill={FACE} />

            {/* gözler */}
            <circle cx="53" cy="37" r="2.4" fill={INK} className="monkey-eye" />
            <circle cx="67" cy="37" r="2.4" fill={INK} className="monkey-eye" />
            {/* gözlük */}
            <g fill="none" stroke={INK} strokeWidth="1.4" opacity="0.8">
              <circle cx="53" cy="37" r="6" />
              <circle cx="67" cy="37" r="6" />
              <path d="M59 37 h2" />
            </g>

            {/* burun ve ağız */}
            <circle cx="58" cy="45" r="1" fill={INK} />
            <circle cx="62" cy="45" r="1" fill={INK} />
            <path d="M55 50 Q60 54 65 50" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* masa */}
          <rect x="6" y="80" width="108" height="6" rx="3" fill="#a16207" />

          {/* açık kitap */}
          <path d="M34 81 L36 70 Q48 67 60 72 L60 81 Z" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="0.8" />
          <path d="M86 81 L84 70 Q72 67 60 72 L60 81 Z" fill="#fafafa" stroke="#d4d4d8" strokeWidth="0.8" />
          <path d="M40 74 Q48 72 56 75 M40 77 Q48 75 56 78" fill="none" stroke="#a1a1aa" strokeWidth="0.9" />
          <path d="M64 75 Q72 72 80 74" fill="none" stroke="#6366f1" strokeWidth="0.9" />

          {/* sol el kitabı tutuyor */}
          <circle cx="38" cy="77" r="4" fill={FUR} />

          {/* sağ kol + kalem: yazı yazıyor */}
          <g className="monkey-write">
            <path d="M78 64 Q84 70 74 76" fill="none" stroke={FUR} strokeWidth="6" strokeLinecap="round" />
            <circle cx="74" cy="76" r="4" fill={FUR} />
            <rect x="72" y="66" width="3" height="12" rx="1" fill="#facc15" transform="rotate(25 73.5 72)" />
            <path d="M70.6 77 L72 80 L73.3 77.6 Z" fill={INK} />
          </g>
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Yükleniyor<span className="monkey-dots inline-block w-4 text-left" />
      </p>
    </div>
  );
}
