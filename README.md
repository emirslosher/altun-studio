# Altun Studio

Türk müziği üretim platformunun pilot sürümü. Next.js App Router, React, TypeScript, Supabase ve Lucide ikonları kullanır. Arayüz Türkçedir ve mobil ekranlara uyumludur.

## Çalıştırma

Node.js 22 veya üzeri ve pnpm gerekir.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

## Bu sürüm

- Müzik tarifi, tarz, enstrüman, tempo ve süre tercihleri.
- Tarayıcıda yerel taslak kaydı, taslak düzenleme ve silme.
- İki gerçek, önceden üretilmiş 10 saniyelik örnek kayıt.
- Oynatma, duraklatma, zaman çizgisi, ses seviyesi, indirme ve yerel beğeniler.
- Kütüphane araması ve ilham şablonları.

E-posta/şifre girişi, pilot üyeliği kontrolü, kişiye özel üretim geçmişi ve özel ses dosyası oynatma eklenmiştir. Canlı üretim için iki SQL migration'ı, yetkilendirilmiş pilot hesap ve çalışan yerel worker gerekir. Taslaklar ve beğeniler mevcut tarayıcıda tutulur; hazır örnekler seçilen ayarlara göre değişmez. Mevcut yerel model CPU kullanır; GPU entegrasyonu henüz yoktur.

Sesler, ACE-Step 1.5 yerel prototipinde üretilmiştir. LoRA örneği kısa teknik eğitim testidir; kalite artışı iddiası içermez. Kaynak müzik arşivi ve model ağırlıkları bu depoya dahil değildir.

## Yayın

GitHub deposu Vercel'e bağlıdır; Next.js önayarını kullanır. Ana dal üretim yayını, diğer dallar önizleme yayını içindir.

Supabase bağlantısı için `.env.example` dosyasını `.env.local` olarak kopyalayıp Project URL ve publishable key alanlarını doldurun. Vercel ortamlarına aynı iki değişken eklenmelidir. `GET /api/health/supabase` yalnızca API bağlantısını doğrular. Bu bağlantı, kullanıcı girişi veya canlı müzik üretimi özelliğini etkinleştirmez.

Veritabanı kurulum adımları `supabase/SETUP.md`, yerel program adımları `worker/README.md` dosyasındadır. İkinci migration ve gizli yerel anahtar kurulumundan sonra gerçek veritabanında iki kullanıcıyla erişim/izolasyon ve uçtan uca üretim testleri yapılmalıdır. Kod derlemesi bu testlerin yerine geçmez.

## Sonraki aşama

1. Pilot hesapla gerçek kuyruk ve dosya erişim testleri.
2. GPU servisinin eklenmesi ve üretim performansı ölçümü.
3. Müzik ekibiyle doğrulanmış veriler, sürümlenmiş eğitim ve dinleme değerlendirmesi.

API anahtarları, müzik arşivleri ve model dosyaları Git deposuna eklenmemelidir.
