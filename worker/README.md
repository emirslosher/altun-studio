# Yerel üretim programı

Bu program bu bilgisayarda önceden doğrulanmış `music_cpu_runtime.py` ve ACE-Step ortamını kullanır. Yeni bilgisayarda model/torch kurulumu ayrıca gerekir. Mevcut Windows/AMD makinede **CPU** kullanılır; GPU hızlandırması uygulanmış değildir.

1. İki Supabase migration'ını sırasıyla çalıştırın.
2. `.env.example` dosyasını `.env.local` olarak kopyalayın. Supabase **secret** anahtarını sadece bu yerel dosyaya yazın. Git'e eklemeyin, sohbetten göndermeyin. `ACESTEP_RUNTIME` mevcut runtime dosyasının tam yoludur.
3. ACE-Step kurulu Python ortamıyla `python worker.py` çalıştırın. `requests` paketi gereklidir. Model yüklendikten sonra site bilgisayarı hazır gösterir.
4. Pilot kullanıcıyla siteden 15 saniyelik istek gönderin. Program açıkken kuyruğu kontrol eder; port açmak gerekmez. Ctrl+C kapatır.

Kullanıcının UUID'sini yönetici olarak `studio_members.user_id` alanına ekleyin. Üretilen dosyalar özel `generated-audio` bucket'ına yüklenir. Tarayıcı yalnızca kendi tamamlanmış kayıtlarına bir saatlik imzalı bağlantı alır. Yerel geçici ses dosyaları iş sonunda silinir.

Süre sınırı 15/30 saniye; aynı anda tek üretim. Program bağlantıyı kaybederse lease süresi dolunca iş, bir sonraki kuyruk kontrolünde başarısız olarak işaretlenir. Otomatik tekrar üretim yapılmaz. Tamamlanamayan yüklemeler özel bucket'ta sahipsiz dosya bırakabilir; pilot sırasında Storage üzerinden temizlenebilir.

Bu temel model demosudur; LoRA eğitimi ve referans sesten dönüştürme bu iş akışına dahil değildir. İlk gerçek kuyruk üretimi, üyelik ve ikinci migration kurulduktan sonra ayrıca doğrulanmalıdır.
