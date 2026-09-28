# Supabase kurulumu

API bağlantısı ile veritabanı kurulumu farklı adımlardır. `/api/health/supabase` yalnızca URL ve publishable key ile Supabase API erişimini doğrular; tabloların veya üretim işçisinin hazır olduğunu söylemez.

## 1. Veritabanı

Supabase projesindeki SQL Editor'da yeni bir sorgu açın. `migrations/202609290001_initial_queue.sql` dosyasının tamamını yapıştırıp bir kez çalıştırın. Dosya tek transaction kullanır. Başarıdan sonra Table Editor'da `studio_members` ve `generation_jobs`, Storage'da özel `generated-audio` bucket'ı görünür.

Ardından `migrations/202609290002_worker.sql` dosyasını ayrı bir sorgu olarak çalıştırın. Bu dosya programın hazır olma durumunu ve iş alma/tamamlama fonksiyonlarını ekler. Publishable key yönetim SQL'i çalıştırma yetkisi sağlamaz.

## 2. Pilot kullanıcılar

Authentication içindeki gerçek kullanıcının UUID'sini `studio_members.user_id` alanına yönetici olarak ekleyin. Kullanıcı kendine erişim veremez. Pilot listesinde olmayan kullanıcı üretim isteği oluşturamaz.

Authentication → URL Configuration içinde Site URL ve Redirect URLs değerlerine `https://altun-studio.vercel.app` ekleyin. Sitede Hesabım yok, kayıt ol ile hesap açıp e-posta onayını tamamlayın. Daha sonra Authentication → Users içindeki o hesabın UUID'sini Table Editor → studio_members → Insert row → user_id alanına ekleyin. Üyeliği herkese otomatik açmayın.

## 3. Yerel işçi

Gizli sunucu anahtarı yalnızca `worker/.env.local` dosyasına eklenir. Sohbete veya tarayıcı koduna konulmaz. `worker/README.md` adımlarını izleyin. Model yüklenip program heartbeat göndermeden üretim düğmesi açılmaz. Program yalnızca dışarıya Supabase bağlantısı kurar.

Bu başlangıç şeması kullanıcı başına bir aktif iş ve 24 saatte 20 istek sınırı uygular. Kayıtlar 15 veya 30 saniye ile sınırlıdır. Tarayıcı tabloları doğrudan değiştiremez; yalnızca sınırları kontrol eden `enqueue_generation` fonksiyonunu çağırabilir.

## Doğrulama

Migration uygulandıktan sonra iki ayrı test kullanıcısıyla sahiplik, pilot listesi, eşzamanlı istek limiti ve özel ses dosyası erişimi test edilmelidir. Bu kontroller yapılana kadar şema üretim için doğrulanmış sayılmaz.
