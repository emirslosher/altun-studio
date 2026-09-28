# Supabase kurulumu

API bağlantısı ile veritabanı kurulumu farklı adımlardır. `/api/health/supabase` yalnızca URL ve publishable key ile Supabase API erişimini doğrular; tabloların veya üretim işçisinin hazır olduğunu söylemez.

## 1. Veritabanı

Supabase projesindeki SQL Editor'da yeni bir sorgu açın. `migrations/202609290001_initial_queue.sql` dosyasının tamamını yapıştırıp bir kez çalıştırın. Dosya tek transaction kullanır. Başarıdan sonra Table Editor'da `studio_members` ve `generation_jobs`, Storage'da özel `generated-audio` bucket'ı görünür.

Bu migration henüz otomatik olarak uygulanmamıştır. Publishable key yönetim SQL'i çalıştırma yetkisi sağlamaz.

## 2. Pilot kullanıcılar — giriş sistemi eklendiğinde

Authentication içindeki gerçek kullanıcının UUID'sini `studio_members.user_id` alanına yönetici olarak ekleyin. Kullanıcı kendine erişim veremez. Pilot listesinde olmayan kullanıcı üretim isteği oluşturamaz.

Site URL: `https://altun-studio.vercel.app`. E-posta giriş yöntemi uygulanırken kullanılacak kesin callback adresleri ayrıca izin listesine eklenmelidir.

## 3. Yerel işçi — sonraki aşama

Gizli sunucu anahtarı, yalnızca bilgisayardaki üretim programının Git dışında tutulan ortam dosyasına eklenecek. Sohbete veya tarayıcı koduna konulmayacak. Kuyruktan atomik iş alma, lease yenileme, sonuç yükleme ve hata yönetimi tamamlanmadan üretim düğmesi etkinleştirilmeyecek.

Bu başlangıç şeması kullanıcı başına bir aktif iş ve 24 saatte 20 istek sınırı uygular. Kayıtlar 15 veya 30 saniye ile sınırlıdır. Tarayıcı tabloları doğrudan değiştiremez; yalnızca sınırları kontrol eden `enqueue_generation` fonksiyonunu çağırabilir.

## Doğrulama

Migration uygulandıktan sonra iki ayrı test kullanıcısıyla sahiplik, pilot listesi, eşzamanlı istek limiti ve özel ses dosyası erişimi test edilmelidir. Bu kontroller yapılana kadar şema üretim için doğrulanmış sayılmaz.
