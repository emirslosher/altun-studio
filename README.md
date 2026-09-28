# Altun Studio

Türk müziği üretim platformunun frontend önizlemesi. Next.js App Router, React, TypeScript ve Lucide ikonları kullanır. Arayüz Türkçedir ve mobil ekranlara uyumludur.

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

Canlı AI üretimi, kullanıcı hesabı, bulut depolama veya GPU bağlantısı yoktur. Taslaklar ve beğeniler yalnızca mevcut tarayıcının localStorage alanında tutulur. Örnek sesler seçilen ayarlara göre değişmez. Arayüz bu sınırları açıkça belirtir.

Sesler, ACE-Step 1.5 yerel prototipinde üretilmiştir. LoRA örneği kısa teknik eğitim testidir; kalite artışı iddiası içermez. Kaynak müzik arşivi ve model ağırlıkları bu depoya dahil değildir.

## Yayın

GitHub deposu Vercel'e bağlıdır; Next.js önayarını kullanır. Ana dal üretim yayını, diğer dallar önizleme yayını içindir.

Supabase bağlantısı için `.env.example` dosyasını `.env.local` olarak kopyalayıp Project URL ve publishable key alanlarını doldurun. Vercel ortamlarına aynı iki değişken eklenmelidir. `GET /api/health/supabase` yalnızca API bağlantısını doğrular. Bu bağlantı, kullanıcı girişi veya canlı müzik üretimi özelliğini etkinleştirmez.

Veritabanı kurulum adımları `supabase/SETUP.md` dosyasındadır. Migration henüz uygulanmamıştır; kullanıcıya özel erişim, kuyruk limitleri ve özel ses depolaması için başlangıç şeması içerir. Uygulama ve worker entegrasyonundan önce gerçek veritabanında erişim testleri yapılmalıdır.

## Sonraki aşama

1. Kullanıcı oturumları ve yetkilendirilmiş kalıcı depolama.
2. Üretim sağlayıcısı arayüzü ve sunucu tarafında doğrulanan iş kuyruğu.
3. GPU servisi, durum takibi, hata/iptal akışları ve maliyet sınırları.
4. Müzik ekibiyle doğrulanmış veriler, sürümlenmiş eğitim ve dinleme değerlendirmesi.

API anahtarları, müzik arşivleri ve model dosyaları Git deposuna eklenmemelidir.
