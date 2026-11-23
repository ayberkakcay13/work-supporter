# Çalışma Planlayıcı — Proje Rehberi

Kişisel ders çalışma planlayıcısı. Tek kullanıcı (Ekrem). Masaüstü tarayıcı ve telefon (ana ekrana eklenebilir PWA).

## Amaç
- Sınav ve projeler **hedef** olarak girilir. Hedeflerin altında **konular** ve **alt başlıklar** vardır.
- Takvim üzerinden "şu tarihte şu konuya çalışacağım" planları yapılır.
- Günlük / haftalık / aylık yapılacaklar listeleri tutulur.
- Çalışma sayacı ile çalışılan süre kaydedilir ve istatistik olarak gösterilir.

## Teknoloji
- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth), tüm tablolarda `user_id` + RLS (sadece sahibi görür)
- Tailwind CSS
- FullCalendar (takvim), Recharts (grafikler), date-fns (`tr` locale)
- Önce localhost, sonra Vercel
- Node.js v24

## Genel kurallar
- Arayüz dili **Türkçe**.
- Saat dilimi **Europe/Istanbul**. Hafta **Pazartesi** başlar.
- Tema: **Açık / Koyu / Otomatik**. Otomatik modda 08:00–18:00 açık, 18:00–08:00 koyu tema kullanılır ve uygulama açıkken saat geçişinde kendiliğinden değişir.
- Gizli anahtarlar sadece `.env.local` içinde durur, repoya girmez. İstemcide sadece Supabase URL ve anon/publishable anahtar kullanılır.

## Ekranlar
1. **Bugün** (ana sayfa): bugünün takvim planları, günlük yapılacaklar, sayaç kısayolu, bugün/bu hafta toplam çalışma süresi
2. **Hedefler**: iki sekme — **Plan** (haftalık plan tahtası, varsayılan) ve **Hedefler** (sınav/proje → konu → alt başlık ağacı)
3. **Takvim**: ay/hafta/gün görünümü; sınav tarihleri otomatik; konular takvime sürüklenip plan yapılır
4. **Yapılacaklar**: Günlük / Haftalık / Aylık sekmeleri
5. **Sayaç**: tam ekran çalışma sayacı
6. **İstatistik**: süreler, ders bazlı dağılım, hedef başarıları, geçmiş özetler
7. **Ayarlar**: tema, varsayılan süreler, ses

## Hedefler, konular ve alt başlıklar
- Hedef türü: sınav / proje / diğer. Alanlar: başlık, ders kodu, tarih-saat, yer, renk, not.
- Konular iç içe olabilir (`parent_id`). Her konu ve alt başlığa bir **tamamlama tarihi** girilir.
- Bitirilen konu tiklenir. Tiklenen konu **silinmez**; kullanıcı silene kadar "tamamlandı" olarak kalır.
- Tamamlama tarihi geçmiş ve tiklenmemiş konu **gecikti** durumuna geçer. Kullanıcıdan **not** istenir (neden yetişmedi). Not yazılınca konu kapatılabilir ya da yeni tarih verilebilir.
- Durumlar: `bekliyor`, `zamanında tamamlandı`, `geç tamamlandı`, `gecikti (not bekliyor)`, `gecikti (notlu)`.

## Haftalık / aylık değerlendirme
- Hafta (Pzt–Paz) ve ay bitince özet gösterilir: zamanında biten / geciken konu sayısı, gecikme notları, toplam çalışma süresi, ders bazlı süre.
- Özet, yeni haftada/ayda uygulama **ilk açıldığında bir kez** modal olarak çıkar (`reviews` tablosuyla takip edilir). Geçmiş özetlere İstatistik ekranından erişilir.

## Sayaç
4 mod:

| | Mola sabit | Mola süresiz |
|---|---|---|
| **Çalışma sabit** | örn. 25 / 10 | sabit çalışma, molayı kullanıcı bitirir |
| **Çalışma süresiz** | kullanıcı durdurur, sonra sabit mola | ikisi de kullanıcı durdurana kadar |

- Süreler her başlatmada o an girilir. Son kullanılan değerler hazır gelir.
- Başlatırken hedef/konu seçimi **isteğe bağlı**.
- Sabit süre dolunca **ses + bildirim** verilir (izin istenir). Bildirim service worker üzerinden gösterilir (`registration.showNotification`); Android Chrome `new Notification()` desteklemez.
- **Push (telefon kilitliyken de alarm):** Supabase `pg_cron` her 15 sn'de `private.trigger_session_alarm()` çalıştırır; süresi dolmuş açık oturum varsa Edge Function `session-alarm` (`supabase/functions/session-alarm`) çağrılır → `close_due_sessions()` oturumu planlanan bitişte kapatır → `push_subscriptions`'taki cihazlara Web Push gider → `public/sw.js` gösterir. Bildirim en fazla ~15 sn gecikebilir.
  - Çağrı anahtarı (`session_alarm_secret`) ve VAPID anahtarları **Vault**'ta; VAPID anahtarlarını fonksiyon ilk çalışmada kendisi üretti. Tarayıcı açık anahtarı `vapid_public_key()` RPC'si ile alır; Vercel'de ortam değişkeni gerekmez.
  - Abonelik: sayaç başlatılınca ve Ayarlar → "Bildirimler" ile (`src/lib/push.ts`). Uygulama açıkken hem yerel hem push gelirse aynı `tag: "sayac"` sayesinde tek bildirim görünür.
- Bir sonraki tur **otomatik başlamaz**, kullanıcı başlatır.
- Süre `setInterval` sayılarak tutulmaz. Başlangıç zamanı (`started_at`) veritabanına yazılır ve süre `now - started_at` ile hesaplanır. Böylece sekme arka plandayken, sayfa yenilenince ya da tarayıcı kapanıp açılınca sayaç doğru kalır. Açık oturum = `ended_at IS NULL`.
- Sadece `work` oturumları çalışma süresine sayılır.
- Başlat / durdur / sil **iyimser** çalışır: ekran hemen güncellenir, kayıt tarayıcıdaki Supabase istemcisiyle arka planda yapılır (`src/lib/sessions-client.ts`); sunucu eylemi ve sayfa yeniden çizimi yoktur. Hata olursa değişiklik geri alınır ve kısa bir uyarı gösterilir. `started_at` / `ended_at` istemcide alınıp açıkça gönderilir, veritabanındaki `now()` varsayılanına güvenilmez.
- **Not — saat sapması:** Başlangıç ve bitiş zamanı tarayıcının (bilgisayarın) saatinden alınır ve süre de o saatle hesaplanır. Bilgisayarın saati çok saparsa (otomatik saat kapalıysa vb.) kaydedilen süreler ve başka cihazda açılan oturumun süresi yanlış görünebilir.

## Veri modeli (taslak)
- `goals`: id, user_id, type, title, course_code, starts_at, location, color, notes, created_at
- `topics`: id, user_id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at
- `plans`: id, user_id, goal_id?, topic_id?, title, starts_at, ends_at, done
- `todos`: id, user_id, title, scope (`day` | `week` | `month`), period_start (date), done_at, goal_id?, sort_order
- `sessions`: id, user_id, kind (`work` | `break`), started_at, ended_at, planned_minutes?, goal_id?, topic_id?
- `reviews`: id, user_id, period_type (`week` | `month`), period_start, seen_at
- `courses`: id, user_id, code (kullanıcı başına tekil), name, color — elle eklenen / düzenlenen ders kartları
- `week_cards`: id, user_id, day (date), course_code, topic?, time? ("HH:mm"), sort_order (double), done
- `settings`: user_id (PK), theme (`light` | `dark` | `auto`), default_work_min, default_break_min, sound_enabled

## Başlangıç verisi (2026-2027 Güz)

| Hedef | Tür | Tarih | Yer |
|---|---|---|---|
| HUM 300 MT2 — Engineering Ethics | sınav | 3 Kasım 2026 18:00–20:00 | A401 |
| COMP 451 MT1 — Intro to NLP | sınav | 12 Kasım 2026 09:30–11:00 | A415 |
| COMP 201 MT2 — Data Structures and Algorithms | sınav | 5 Aralık 2026 10:30–12:30 | A302, A415 |
| HUM 300 MT3 — Engineering Ethics | sınav | 8 Aralık 2026 18:00–20:00 | A401 |
| COMP 421 MT2 — Computer Networks | sınav | 11 Aralık 2026 18:00–19:30 | A415, A302 |
| COMP 491 — Senior Design Project I | proje | Proje/Sunum dönemi 14–31 Aralık 2026 | — |

Takvim işaretleri (akademik takvim):
- 20 Kasım 2026: Dersten çekilme (W) son günü, 16:00
- 11 Aralık 2026: Derslerin son günü
- 14–31 Aralık 2026: Proje/Sunum dönemi

## Aşamalar
0. **Kurulum**: Next.js iskeleti, Tailwind, Supabase istemcisi, tablolar + RLS (SQL migration), giriş (e-posta), tema sistemi, ana layout + menü
1. **Hedefler**: hedef/konu/alt başlık CRUD, tamamlama tarihi, tik, gecikme notu, başlangıç verisi
2. **Takvim**: FullCalendar, hedef tarihleri, plan oluşturma/sürükle-bırak, konuya bağlama
3. **Yapılacaklar**: gün/hafta/ay listeleri, dönemler arası gezinme
4. **Sayaç**: 4 mod, ses + bildirim, oturum kaydı, hedef/konu seçimi
5. **İstatistik + özetler**: grafikler, haftalık/aylık değerlendirme modalı
6. **Yayın**: Vercel (yayında)
7. **Telefon + hız**: PWA (manifest, ikonlar), mobil düzen (alt sekme çubuğu, safe-area), yükleme iskeletleri

Her aşama sonunda uygulama çalışır durumda olmalı ve kullanıcı deneyebilmeli.

## İlerleme
- **0–5 tamam**: kurulum, hedefler, takvim, yapılacaklar, sayaç, istatistik + özetler. Ek olarak ana ekran ve gün planı (saatlere ders yerleştirme).
- **6. Yayın**: Vercel'de yayında (GitHub `main` push'u ile).
- **7. Telefon + hız (2026-11-15)**:
  - PWA: `src/app/manifest.ts` (standalone, 192/512 + maskable ikonlar `public/icons/`), `public/apple-touch-icon.png`, kök layout'ta `appleWebApp` ve `viewport` (`viewport-fit=cover`, tema rengi). Çevrimdışı çalışma **yok** (istenmedi).
  - Mobil düzen (< 768 px): yan menü yerine altta sabit sekme çubuğu (`Sidebar.tsx`); `main` altta sekme çubuğu, üstte çentik kadar boşluk bırakır (`env(safe-area-inset-*)`). Takvim telefonda haftalık **liste** görünümüyle açılır, görünüm düğmeleri altta. Sayaç düğmeleri ve seçim çipleri en az 44 px. Girdiler telefonda 16 px (iOS yakınlaştırmasın). "Üzerine gelince görünen" düğmeler dokunmatikte hep görünür (`can-hover:` varyantı).
  - Hız: her sayfada `loading.tsx` iskeleti (`components/Skeleton.tsx`); sunucu eylemleri `getUser()` yerine `getClaims()` kullanır (`authedClient()` in `lib/supabase/server.ts`); Yapılacaklar sayfası hedefleri bir kez çeker (5 → 4 sorgu); Ayarlar'daki sayaç ayarları tarayıcıdan sonradan değil sunucuda okunur. Middleware zaten `getClaims()` kullanıyordu.
- **Android + push (2026-11-15)**: kullanıcı Android kullanıyor. Service worker (`public/sw.js`, sadece bildirim), Web Push zinciri (yukarıda "Sayaç"), Ayarlar'da bildirim aç/kapat + deneme. Migration `0006_push.sql`, `0007_cron_cleanup.sql`.
- **Haftalık plan tahtası (2026-11-23)**: Hedefler > Plan sekmesi (`components/goals/WeekBoard.tsx`, `lib/week.ts`, migration `0008_week_board.sql`). Solda ders kartları: hedeflerdeki ders kodları otomatik (ad başlıktaki "—" sonrası, renk hedeften), "+ Kart ekle" ile elle ders; aynı kodda `courses` satırı varsa ad/renk ondan. Pzt–Paz sütunları, kartlar sürükle-bırak ile güne ve kartların arasındaki kesikli boşluklara konur (sıra `sort_order` ara değeriyle). Karta tıklayınca konu (serbest yazı, hedef konuları öneri), gün, isteğe bağlı saat, tamamlandı, yukarı/aşağı, sil. "+ Oluştur" ile ders/konu/gün seçip kart ekleme. İyimser kayıt (tarayıcı Supabase istemcisi, hata olursa geri alınır). Planları/istatistikleri etkilemez. Bugünün kartları ana ekranda "Bugünün kartları" bölümünde. Hafta adres çubuğunda: `/hedefler?sekme=plan&hafta=yyyy-MM-dd`.
- **Sonra**: Android'de ekran ekran kontrol turu (kullanıcı yapacak, sorunları bildirecek).
