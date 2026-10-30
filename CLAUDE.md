# Çalışma Planlayıcı — Proje Rehberi

Kişisel ders çalışma planlayıcısı. Tek kullanıcı (Ekrem), şimdilik sadece bilgisayar (masaüstü tarayıcı). Telefon desteği (PWA) daha sonra eklenecek.

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
2. **Hedefler**: sınav/proje → konu → alt başlık ağacı
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
- Sabit süre dolunca **ses + masaüstü bildirimi** verilir (Notification API, izin istenir).
- Bir sonraki tur **otomatik başlamaz**, kullanıcı başlatır.
- Süre `setInterval` sayılarak tutulmaz. Başlangıç zamanı (`started_at`) veritabanına yazılır ve süre `now - started_at` ile hesaplanır. Böylece sekme arka plandayken, sayfa yenilenince ya da tarayıcı kapanıp açılınca sayaç doğru kalır. Açık oturum = `ended_at IS NULL`.
- Sadece `work` oturumları çalışma süresine sayılır.

## Veri modeli (taslak)
- `goals`: id, user_id, type, title, course_code, starts_at, location, color, notes, created_at
- `topics`: id, user_id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at
- `plans`: id, user_id, goal_id?, topic_id?, title, starts_at, ends_at, done
- `todos`: id, user_id, title, scope (`day` | `week` | `month`), period_start (date), done_at, goal_id?, sort_order
- `sessions`: id, user_id, kind (`work` | `break`), started_at, ended_at, planned_minutes?, goal_id?, topic_id?
- `reviews`: id, user_id, period_type (`week` | `month`), period_start, seen_at
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
6. **Yayın**: Vercel
7. **Sonra**: telefon (PWA, mobil düzen)

Her aşama sonunda uygulama çalışır durumda olmalı ve kullanıcı deneyebilmeli.
