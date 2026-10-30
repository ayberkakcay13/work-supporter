# Çalışma Planlayıcı

Kişisel ders çalışma planlayıcısı. Proje rehberi: [CLAUDE.md](CLAUDE.md).

## Kurulum

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur.
2. **SQL Editor**'da [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) dosyasının içeriğini çalıştır.
3. **Project Settings → API** sayfasından proje URL'sini ve publishable (anon) anahtarı `.env.local` dosyasına yaz (örnek: `.env.example`).
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000`, Redirect URLs listesine `http://localhost:3000/auth/callback` ekle.
5. Çalıştır:

```bash
npm install
npm run dev
```

http://localhost:3000 adresinde "Hesap oluştur" ile kaydol. Supabase'de e-posta doğrulaması açıksa gelen bağlantıya tıkla.
