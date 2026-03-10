TazelenmeApp - Yazılım Gereksinimleri (SRS)
1. Proje Özeti ve Vizyon
TazelenmeApp, 60+ yaş grubunun eğitim gördüğü Tazelenme Üniversitesi sosyal sorumluluk projesi için özel olarak tasarlanmış bir Öğrenci Yönetim ve Yoklama Otomasyon Sistemidir. Sistemin temel amacı; kağıt/kalem ile alınan, 200 kişilik amfilerde kaosa ve zaman kaybına yol açan yoklama sürecini Fiziksel Kart (RFID/Barkod) ile dijitalleştirmek, yaşlı öğrencilerin sağlık/demografik verilerini güvenle saklamak ve "sosyal izolasyon" riskine karşı devamsızlık alarmları üretmektir. Sistem, herhangi bir sunucuda kolayca ayağa kalkabilmesi için Docker mimarisiyle tasarlanacaktır.
2. Kullanıcı Rolleri (Actors)
Sahadaki işleyişe göre sistemde 2 ana insan rolü ve 1 sistem rolü bulunmaktadır:
Koordinatör (Admin): Sistemin tek hakimidir. Öğrenci kaydı yapar, sağlık verilerini girer, yoklama seanslarını başlatır, RFID/Barkod kartlarını öğrencilere tanımlar veya iptal eder, ders materyallerini yükler ve yıl sonu "Geçti/Kaldı" raporlarını çeker.
Öğrenci (60+ Yaş): Sisteme sadece TC Kimlik No ve basit bir şifre (veya PIN) ile giriş yapar. Sadece kendi kayıtlı olduğu dersleri, devamsızlık durumunu ve o derslere ait yüklenmiş PDF/Link materyallerini görebilir. (Gizlilik esastır, diğer öğrencileri göremez).
Donanım / Okuyucu (Sistem Rolü): Sınıf kapısındaki okuyucu cihazdır. Kart okutulduğunda Backend API'sine anlık olarak [Kart_UID, Ders_ID, Zaman_Damgası] bilgisini gönderir.
3. Fonksiyonel Gereksinimler (Functional Requirements)
Modül 1: Hızlı Yoklama ve Kart Yönetimi (Core Module)
FR-1.1: Fiziksel Kart ile Yoklama: Sistem, harici bir cihazdan (Barkod/RFID okuyucu) gelen istekleri (HTTP POST) karşılayacak bir API'ye sahip olmalıdır. Okutulan kartın UID'si ile öğrenciyi eşleştirip o ders için anında "Burada" (Present) olarak işaretlemelidir.
FR-1.2: Kart Atama ve İptali: Koordinatör, sistem üzerinden bir öğrenciye fiziksel kart UID'si tanımlayabilmeli; kartın kaybolması/çalınması durumunda başkasının yerine imza atılmasını engellemek için kartı tek tuşla "Pasif" duruma getirebilmelidir.
FR-1.3: Manuel Yoklama (Fallback): Kartını unutan öğrenciler için Koordinatör, aktif ders ekranında öğrenci listesini görüp tek tıkla manuel olarak "Geldi" / "Gelmedi" / "İzinli" işaretlemesi yapabilmelidir.
FR-1.4: Çift Okutma Koruması (Anti-Passback): Bir öğrenci kartını aynı ders seansı içinde yanlışlıkla birden fazla kez okutursa, sistem bunu tek bir "Geldi" işlemi olarak saymalı, hata vermemeli veya mükerrer kayıt oluşturmamalıdır.
Modül 2: Öğrenci ve Sağlık Verileri Yönetimi
FR-2.1: Demografik Kayıt: Koordinatör; öğrencinin Ad, Soyad, TC Kimlik No, İletişim Bilgileri, Acil Durum Kişisi ve Telefonu gibi verilerini sisteme kaydedebilmelidir.
FR-2.2: Çoklu Seçmeli Sağlık Formu: Öğrencinin sağlık verileri (Diyabet, Hipertansiyon, Kalp Rahatsızlığı, Fiziksel Engel vb.) "Çoklu Seçim" (Checkbox/Multi-select) formatında kaydedilmelidir. Diğer özel durumlar için bir "Diğer (Metin)" alanı bulunmalıdır.
Modül 3: Otomasyon ve İzolasyon Alarmları
FR-3.1: Sosyal İzolasyon Uyarısı: Sistem, 3 hafta üst üste hiçbir derse katılmayan (sürekli "Yok" yazılan) öğrenciyi tespit etmeli ve Koordinatör paneline "Riskli / İletişime Geçilmeli" etiketiyle otomatik bildirim/uyarı düşürmelidir.
FR-3.2: Otomatik Geçti/Kaldı Hesaplama: Tazelenme Üniversitesi'nde sınav olmadığından, sistem dönem sonunda belirlenen devamsızlık sınırına (Örn: %70 katılım zorunluluğu) göre öğrencilerin "Geçti" veya "Kaldı" durumlarını otomatik hesaplayıp listelemelidir.
Modül 4: Ders ve Materyal Yönetimi (Mini-LMS)
FR-4.1: Ders Materyali Yükleme: Koordinatör, belirli bir derse ait ders notlarını (PDF formatında) veya harici video/sunum bağlantılarını (Link) sisteme yükleyebilmelidir.
FR-4.2: Öğrenci Paneli Erişimi: Öğrenciler sisteme (PWA/Web üzerinden) giriş yaptıklarında, sadece kayıtlı oldukları sınıfa/derse ait materyalleri görebilmeli ve cihazlarına indirebilmelidir.
4. Fonksiyonel Olmayan Gereksinimler (Non-Functional Requirements)
NFR-1: Kullanıcı Arayüzü / Erişilebilirlik (UI/UX - A11Y): Öğrenci arayüzü 60+ yaş grubuna özel tasarlanmalıdır. Yazı tipleri büyük (min. 18px), renk kontrastları yüksek olmalı; karmaşık açılır menüler (hamburger menu) yerine doğrudan, büyük butonlu, tek sayfalık bir yönlendirme (PWA mantığı) kullanılmalıdır.
NFR-2: Konteynerizasyon (Docker): Uygulama (Backend, Veritabanı ve Frontend) .NET veya sunucu bağımlılıklarından arındırılmış olup, docker-compose up komutuyla herhangi bir makinede tek seferde ayağa kalkacak şekilde (Dockerized) teslim edilmelidir.
NFR-3: Performans (Peak Load): Sistem, ders başlangıcında 200 öğrencinin kapıdan arka arkaya ve saniyeler içinde geçeceği anlık yüklenmeleri (Concurrency) veritabanı kilitlenmesi yaşamadan kaldırabilmelidir.
NFR-4: KVKK Uyumluluğu (Gizlilik): Öğrencilerin TC Kimlik numaraları ve sağlık verileri sistemde güvenli tutulmalı; hiçbir öğrenci bir başka öğrencinin listesini, notlarını, devamsızlığını veya sağlık verisini görememelidir.


1. Frontend (Kullanıcı Arayüzü & PWA)
Arayüzde hem yaşlılar için bir mobil web uygulaması (PWA) hem de yöneticiler için bir web paneli olacak.
Framework: Next.js (React)
Neden? Şu an sektör standardı. Hem çok hızlı çalışır hem de next-pwa eklentisi ile yaşlıların telefonuna tek tıkla (App Store'a girmeden) uygulama gibi indirilebilir.
Stilleme (Styling): Tailwind CSS
Neden? Hızlı tasarım yapmanı sağlar. Yaşlılar için "büyük punto, yüksek kontrast" gibi ayarları (text-2xl, contrast-125) saniyeler içinde yaparsın.
UI Kütüphanesi: shadcn/ui
Neden? Hazır, inanılmaz profesyonel, şık ve en önemlisi Erişilebilirlik (Accessibility - A11Y) standartlarına tam uyumlu bileşenler sunar. Yaşlılar için ekran okuyucu uyumluluğu, doğru odaklanma (focus) gibi detayları senin yerine çözer. Admin paneli için de muazzam Data Table (veri tabloları) sağlar.

2. Backend (API & İş Mantığı)
Sınıf kapısındaki kart okuyucudan saniyeler içinde arka arkaya gelecek 200 kişilik okutma verisini kilitlenmeden, asenkron şekilde karşılayabilecek bir yapı lazım.
Dil & Çerçeve: Node.js + Express.js (TypeScript ile) VEYA FastAPI (Python)
Benim Tavsiyem: Node.js (TypeScript) kullanman. Hem Frontend (Next.js) hem Backend (Node.js) aynı dil (JavaScript/TypeScript) olacağı için "Full-Stack" geliştirme hızın x2 artar. Context switch yaşamazsın.
Eğer Python'a daha yatkınsan FastAPI şu an piyasadaki en modern, en hızlı API yazma framework'üdür. Donanımdan gelen verileri (HTTP POST) anında veritabanına yazar.
ORM (Veritabanı Yönetimi): Prisma ORM
Neden? SQL sorguları yazmakla uğraşmazsın. Veritabanı tablolarını çok temiz bir şemada tanımlarsın, Prisma sana harika bir otomatik tamamlama (autocomplete) sunar.

3. Veritabanı (Database)
Seçim: PostgreSQL
Neden? Açık kaynaklı, ücretsiz, Docker üzerinde muazzam kararlı çalışır ve ilişkisel veriler (Öğrenci -> Ders -> Yoklama Kaydı -> Sağlık Bilgisi) için en iyi seçenektir.

4. Donanım / IoT Katmanı (Projenin "Şov" Kısmı)
Madem sınıfta kart okutulacak, hocalara projeyi sunarken masaya koyacağın donanım:
Mikrodenetleyici: ESP8266 (NodeMCU) veya ESP32 (Ortalama 100-150 TL)
Okuyucu Modül: RC522 RFID Okuyucu (Ortalama 50-80 TL)
Nasıl Çalışır? ESP8266 Wi-Fi'a bağlanır. Biri kartı okuttuğunda, kartın içindeki ID'yi alır ve senin yazdığın Node.js/FastAPI Backend'ine anında POST /api/attendance { uid: "1A2B3C4D" } şeklinde bir istek atar. Sunumda bunu çalışır halde göstermen, yazılım mühendisliği hocalarını büyüler.

5. Altyapı ve Dağıtım (DevOps)
Docker & Docker Compose
Nasıl Olacak? Bir tane docker-compose.yml dosyası yazacağız. İçinde frontend, backend ve db (postgres) container'ları olacak. Hocalar projeyi incelemek istediklerinde sadece docker-compose up -d yazacaklar ve tüm sistem (veritabanı dâhil) 10 saniye içinde kendi bilgisayarlarında ayağa kalkacak.
UX/UI Stratejisi (Kullanıcı Deneyimi Ayrımı)
Kullandığımız bu Tech Stack ile arayüzü ikiye ayıracağız:
Öğrenci Arayüzü (60+ Yaş):
Giriş ekranı sadece TC Kimlik No ve şifreden oluşacak.
Ekranda en fazla 2-3 devasa buton olacak (Örn: [ 📅 Derslerim ve Devamsızlığım ], [ 📚 Ders Notlarım ]).
Tıklanabilir alanlar parmak titremeleri veya yanlış dokunmalara karşı devasa boyutlarda (min. 48x48 piksel) olacak.
Renkler "Göz Yormayan ama Yüksek Kontrastlı" (Örn: Koyu Lacivert zemin üzerine Beyaz kalın yazılar) olacak.
Koordinatör (Admin) Arayüzü:
Tam bir "Modern SaaS" paneli olacak (sol tarafta Sidebar, ortada geniş veri tabloları).
Öğrencileri filtreleme, Excel'e dışa aktarma (export), sağlık uyarılarını kırmızı rozetlerle (badge) görme gibi detaylar yer alacak.

1. Koordinatör Dashboard'u (Yönetim Paneli)
Kesinlikle profesyonel bir Admin Dashboard yapacağız. Bu panel, hocaların ve koordinatörlerin iş yükünü %90 azaltacak. Dashboard'un içinde şunlar olacak:
Ana Ekran (Overview): O günkü derslerin listesi, anlık yoklama oranları (Gelenler/Gelmeyenler grafiği) ve en önemlisi "Kritik Uyarılar" köşesi (Örn: "Ahmet Yılmaz 3 haftadır gelmiyor!", "Ayşe Teyze'nin kartı kayıp bildirildi").
Öğrenci Yönetimi: Öğrencilerin listesi, TC, Ad-Soyad, iletişim bilgileri. Buradan öğrenci profiline tıklandığında detaylı Sağlık Verileri ve Kayıtlı RFID Kart Numarası (UID) görülecek.
Yoklama & Sınıf Yönetimi: Hoca sınıf listesini açıp, fiziksel kartını unutanları tek tıkla "Geldi" yapabilecek. Veya geçmişe dönük bir tarihin yoklama Excel'ini indirebilecek.
Ders ve Materyal Yönetimi: Haftalık ders programının girildiği ve o derslere PDF/Link eklenebilen modül.
(Teknik Not: Bu Dashboard için Next.js tarafında shadcn/ui kullanarak, sol tarafta modern bir menü (Sidebar), ortada filtrenebilir veri tabloları (Data Tables) ve sağ üstte Excel'e aktar butonları olan çok şık bir ekran tasarlayacağız.)

2. 60+ Yaş Grubu İçin Giriş (Şifre) Çözümleri (Ai önerisi ama şifre olmalı taraftarıyım.!)
Yaşlılar için Aa123456! gibi karmaşık şifreler işkencedir. Sadece TC veya 1234 yaparsak da dediğin gibi teyzeler amcalar birbirinin TC'sini bilip başkasının yerine sisteme girebilir (gizlilik ihlali).
Bunun için sana 3 farklı modern çözüm sunuyorum. Hangisi kafana yatarsa onu uygulayabiliriz:
Çözüm A: T.C. Kimlik No + Sistemin Atadığı "ATM PIN Kodu" (En Pratik)
Nasıl Çalışır? Sisteme giriş ekranında klavye açılmaz. Ekranda banka ATM'si gibi kocaman, dokunması kolay rakamlar (Numpad) çıkar. Öğrenci TC'sini yazar, ardından 4 haneli PIN girer.
Güvenlik: Bu 4 haneli PIN'i öğrenci belirlemez (1903, 1234 yapmasınlar diye). Sistem her öğrenciye rastgele (Örn: 7492) bir PIN atar. Dönem başında öğrencilere RFID yoklama kartları teslim edilirken, kartın arkasına yapıştırılmış bir etiketle veya küçük bir zarfla bu PIN onlara verilir. "Uygulamaya girerken bu şifreyi kullanın" denir.
Çözüm B: "Sihirli" QR Kod ile Şifresiz Giriş (En Şov / En Yenilikçi)
Nasıl Çalışır? Öğrenciler TC veya şifre ezberlemekle hiç uğraşmaz. PWA'yı açtıklarında karşılarına kocaman bir "Kartım ile Giriş Yap" butonu çıkar.
Güvenlik: Öğrencilere dağıtılan fiziksel yoklama kartlarının (RFID kart) arkasına, sistemden otomatik üretilmiş kişiye özel bir QR Kod basılır/yapıştırılır. Öğrenci uygulamada butona basar, kamerası açılır, kendi yaka kartının arkasını telefona gösterir ve şifresiz şekilde anında kendi profiline giriş yapar.
Avantajı: Başkasının profiline girmesi için fiziksel kartı çalması gerekir. Yaşlılar için şifre yazma derdi sıfırdır. Hocalara sunumda bunu gösterirsen çok büyük artı alırsın.
Çözüm C: T.C. Kimlik No + SMS Doğrulama (OTP) (En Güvenli ama Maliyetli)
Nasıl Çalışır? TC Kimlik numarasını girer. Sistem, kayıtlı cep telefonuna 4 haneli bir SMS kodu gönderir.
Dezavantaj: SMS göndermek için bir API (Netgsm, Twilio vb.) bütçesi gerekir. Proje gönüllü yapıldığı için SMS maliyeti üniversiteye veya sana yansıyabilir. O yüzden okul projelerinde pek tavsiye etmem (ancak "ileride eklenebilir" diye rapora yazabiliriz).


**TazelenmeApp Veritabanı (DB) Şeması** (Ai önerisi)
code
Prisma
// --- ENUMLAR (Sabit Değerler) ---

enum Role {
  ADMIN       // Koordinatörler (Her şeye yetkisi var)
  STUDENT     // 60+ Yaş Öğrenciler (Sadece kendi verisini görür)
}

enum CardStatus {
  ACTIVE      // Aktif Kart
  LOST        // Kayıp/Çalıntı (Okutulursa uyarı verir)
  REVOKED     // İptal Edilmiş
}

enum AttendanceStatus {
  PRESENT     // Geldi
  ABSENT      // Gelmedi
  EXCUSED     // İzinli/Raporlu
}

enum AttendanceMethod {
  RFID        // Kapıdan kart okutarak geldi
  MANUAL      // Kartı unuttu, Koordinatör elle "Geldi" yaptı
}

enum HealthCondition {
  DIABETES        // Şeker
  HYPERTENSION    // Tansiyon
  HEART_DISEASE   // Kalp
  DEMENTIA        // Unutkanlık/Nörolojik
  PHYSICAL_ISSUE  // Fiziksel Engel
  OTHER           // Diğer (Metin kutusuna yazılacak)
}

// --- TABLOLAR (Modeller) ---

// 1. KULLANICI TABLOSU (Admin ve Öğrenciler Ortak)
model User {
  id             String    @id @default(uuid())
  tcNo           String    @unique // Sisteme giriş için kullanılacak (TC)
  pinHash        String    // 4 Haneli Şifrenin şifrelenmiş (hash) hali
  role           Role      @default(STUDENT)
  
  firstName      String
  lastName       String
  phone          String?

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // İlişkiler
  studentProfile StudentProfile? // Sadece öğrenciyse bu profil dolar
}

// 2. ÖĞRENCİ DETAY VE SAĞLIK TABLOSU
model StudentProfile {
  id                     String    @id @default(uuid())
  userId                 String    @unique
  user                   User      @relation(fields: [userId], references: [id])
  
  address                String?
  emergencyContactName   String?   // Acil durumlarda aranacak kişi
  emergencyContactPhone  String?   // Acil kişi telefonu
  
  // Sağlık Verileri (PostgreSQL'in harika özelliklerinden olan Array Enum)
  healthConditions       HealthCondition[] 
  otherHealthNotes       String?   // "Diğer" seçilirse hocanın gireceği serbest metin
  
  // 3 Hafta İzolasyon Uyarısı için Bayrak
  isAtRisk               Boolean   @default(false)

  // İlişkiler
  rfidCards              RfidCard[]
  enrollments            Enrollment[]
  attendances            Attendance[]
}

// 3. DONANIM / FİZİKSEL KART TABLOSU (En Kritik Tablolardan Biri)
model RfidCard {
  id             String         @id @default(uuid())
  uid            String         @unique // Kartın içinden okunan 8-10 haneli fiziksel ID
  studentId      String
  student        StudentProfile @relation(fields:[studentId], references: [id])
  
  status         CardStatus     @default(ACTIVE)
  assignedAt     DateTime       @default(now())
  
  // Not: Bir öğrencinin geçmişte kaybettiği kartlar olabilir, 
  // bu yüzden 1 öğrencinin birden fazla kart kaydı olabilir ama sadece 1'i ACTIVE'dir.
}

// 4. DERSLER TABLOSU
model Course {
  id             String    @id @default(uuid())
  name           String    // Örn: "Miras Hukuku", "Teknoloji Okuryazarlığı"
  term           String    // Örn: "2024-Güz", "2025-Bahar"
  isActive       Boolean   @default(true)
  
  // İlişkiler
  enrollments    Enrollment[]
  sessions       LessonSession[]
  materials      CourseMaterial[]
}

// 5. ÖĞRENCİ-DERS KAYIT TABLOSU (Hangi öğrenci hangi dersi alıyor)
model Enrollment {
  id             String         @id @default(uuid())
  studentId      String
  student        StudentProfile @relation(fields: [studentId], references: [id])
  courseId       String
  course         Course         @relation(fields: [courseId], references: [id])
  
  @@unique([studentId, courseId]) // Bir öğrenci bir derse bir kez kayıt olabilir
}

// 6. DERS OTURUMU (Yoklama Alınacak Gün/Hafta)
model LessonSession {
  id             String       @id @default(uuid())
  courseId       String
  course         Course       @relation(fields: [courseId], references: [id])
  
  sessionDate    DateTime     // Dersin yapıldığı gün ve saat
  weekNumber     Int          // Örn: 3. Hafta
  
  // İlişkiler
  attendances    Attendance[]
}

// 7. YOKLAMA TABLOSU (Sistemin Kalbi)
model Attendance {
  id             String           @id @default(uuid())
  sessionId      String
  session        LessonSession    @relation(fields:[sessionId], references: [id])
  
  studentId      String
  student        StudentProfile   @relation(fields: [studentId], references: [id])
  
  status         AttendanceStatus @default(ABSENT)
  method         AttendanceMethod? // Eğer status PRESENT ise RFID mi, MANUAL mı?
  
  timestamp      DateTime         @default(now())

  @@unique([sessionId, studentId]) // Bir öğrenci bir derste iki kere "Geldi" yazılamaz (Anti-Passback)
}

// 8. DERS MATERYALLERİ (Mini-LMS)
model CourseMaterial {
  id             String    @id @default(uuid())
  courseId       String
  course         Course    @relation(fields:[courseId], references: [id])
  
  title          String    // Örn: "1. Hafta Sunumu"
  url            String    // PDF dosya yolu veya harici link
  type           String    // "PDF", "LINK", "VIDEO"
  
  uploadedAt     DateTime  @default(now())
}
Bu Şema Neleri Çözüyor? Neden Harika?
Güvenlik ve Performans (Anti-Passback): Öğrenci aynı derste kartını 5 kere bile okutsa, Attendance tablosundaki @@unique([sessionId, studentId]) kuralı sayesinde veritabanı çöplüğe dönmez, sadece 1 kayıt atılır.
Kayıp Kart Sorunsalı (RfidCard): Hocalar toplantıda "Kopyalanmasın, iptal edebilelim" demişti. Öğrenci kartını kaybederse, Koordinatör Dashboard'dan o kartı LOST veya REVOKED yapar. Sisteme yeni bir kart ACTIVE olarak eklenir. Okuyucu eski kartı okursa sistem 403 Forbidden (İptal Edilmiş Kart) uyarısı verir. Kapıdan kimse geçemez.
İzolasyon ve Otomasyon (isAtRisk): Cron Job (Zamanlanmış Görev) yazacağız. Sistem her cuma akşamı Attendance tablosuna bakacak. "Bu teyze son 3 haftadır tüm LessonSession kayıtlarında ABSENT mi?" Evetse, StudentProfile içindeki isAtRisk değerini true yapacak ve Koordinatörün ekranında kırmızı alarm yanacak.
Sağlık Verileri: HealthCondition bir dizi (Array) olduğu için hem çok hızlı aranabilir hem de Koordinatörler Excel raporu çekerken "Kaç tane diyabet hastamız var?" sorgusunu nanosaniyeler içinde yapabilir. Serbest metinler gibi harf hatası olmaz.
Öğrenci Girişi: User tablosundaki tcNo ve pinHash. Öğrenci "12345678901" ve "4921" PIN'i ile girer. Sadece kendine ait studentProfile datasını görür.

BÖLÜM 1: Genel Mimari Akış (Sistem Nasıl Çalışacak?)
Projemiz 4 ana bloktan oluşuyor. Her şey Docker içinde, birbirinden bağımsız ama uyum içinde çalışacak (Microservice mantığına yakın, temiz bir Monolith mimari).
IoT Cihazı (Sınıf Kapısı): Wi-Fi'a bağlı, sadece kart okuyup Backend'e HTTP POST isteği atan "aptal ama hızlı" cihaz.
Frontend (Next.js - PWA & Admin Paneli): Kullanıcıların gördüğü yüz. Öğrenciler PWA'dan notlarına bakar, Koordinatörler Admin panelinden sistemi yönetir.
Backend API (Node.js/Express + Prisma): Sistemin beyni. İş kuralları (Business Logic) burada çalışır. (Örn: "Bu kart aktif mi?", "Bu öğrenci derse kayıtlı mı?", "3 haftadır gelmiyor mu?").
Veritabanı (PostgreSQL): Sadece verileri güvenli ve ilişkisel bir şekilde tuttuğumuz depo.
Sihirli Kısım: "Aktif Dersi Otomatik Bulma"
Koordinatörün her ders başında "Yoklamayı Başlat" tuşuna basmasına gerek kalmamalı. Sınıftaki donanım cihazı (Örn: Amfi-1 kapısındaki okuyucu) kartı okuttuğunda, Backend o anki saate (Örn: Salı 10:00) ve sınıfa bakar. O saatte hangi LessonSession (Ders Oturumu) varsa, öğrenciyi otomatik olarak o derse "Geldi" yazar. Koordinatör sadece arkasına yaslanıp Dashboard'dan sayının artışını izler.
BÖLÜM 2: IoT -> API Entegrasyonu (Donanım Nasıl Konuşacak?)
Sınıf kapısına koyduğumuz ESP8266 (Wi-Fi çipli mikrodenetleyici) ve RC522 (RFID Okuyucu) ikilisini düşünelim.
1. Cihazın Göndereceği Veri (JSON Payload)
Ahmet Amca geldi, kartını okuyucuya yaklaştırdı. Cihaz (ESP8266) anında Wi-Fi üzerinden senin Node.js API'ne şu çok basit veriyi yollar:
code
JSON
// POST: /api/v1/attendance/scan
{
  "cardUid": "A1B2C3D4",  // Kartın içinden okunan fiziksel çip numarası
  "deviceLocation": "AMFI_1" // Hangi sınıfın kapısından okutuldu?
}
2. Backend'in Bu İsteği Karşılama Mantığı (Node.js + Prisma)
Gelen bu basit isteği Backend'de nasıl karşılayacağımızı ve güvenlik önlemlerini nasıl alacağımızı gösteren örnek bir API kodu:
code
TypeScript
// --- attendance.controller.ts ---

app.post('/api/v1/attendance/scan', async (req, res) => {
  const { cardUid, deviceLocation } = req.body;

  try {
    // 1. ADIM: Bu kart sistemde var mı ve AKTİF mi?
    const rfidRecord = await prisma.rfidCard.findUnique({
      where: { uid: cardUid },
      include: { student: true } // Öğrenci bilgilerini de getir
    });

    if (!rfidRecord) {
      return res.status(404).json({ error: "Kayıtsız Kart!" }); 
      // Cihaz kırmızı ışık yakar ve uzun bip sesi çıkarır
    }

    if (rfidRecord.status === 'LOST' || rfidRecord.status === 'REVOKED') {
      return res.status(403).json({ error: "İptal Edilmiş Kart! Lütfen Koordinatöre Gidin." });
      // Cihaz 3 kere kırmızı yanıp söner (Güvenlik ihlali)
    }

    // 2. ADIM: O an o sınıfta (AMFI_1) işlenen Aktif Dersi bul
    const currentSession = await findActiveSessionForLocation(deviceLocation);
    if (!currentSession) {
      return res.status(400).json({ error: "Şu an bu sınıfta aktif bir ders bulunmuyor." });
    }

    // 3. ADIM: Yoklamayı Veritabanına Yaz (Anti-Passback koruması ile)
    // Öğrenci zaten 5 dakika önce okuttuysa hata vermeyiz, "Zaten Okutuldu" deriz.
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: { // Şemadaki @@unique kuralı
          sessionId: currentSession.id,
          studentId: rfidRecord.studentId
        }
      }
    });

    if (existingAttendance) {
      return res.status(200).json({ message: "Zaten Yoklama Alındı", studentName: rfidRecord.student.firstName });
      // Cihaz kısa yeşil yanar (Sorun yok, geç)
    }

    // İlk defa okutuyorsa veritabanına kaydet
    await prisma.attendance.create({
      data: {
        sessionId: currentSession.id,
        studentId: rfidRecord.studentId,
        status: 'PRESENT',
        method: 'RFID'
      }
    });

    // BAŞARILI YANIT!
    return res.status(200).json({ 
      message: "Yoklama Başarılı", 
      studentName: `${rfidRecord.student.firstName} ${rfidRecord.student.lastName}` 
    });
    // Cihaz uzun bir yeşil ışık yakar ve tatlı bir bip sesi çıkarır (Geçiş Onaylandı)

  } catch (error) {
    return res.status(500).json({ error: "Sunucu Hatası" });
  }
});
BÖLÜM 3: Gerçek Zamanlılık (Real-Time Magic)
Senin API'n bu işlemi milisaniyeler içinde yapacak.
Cihaz Tarafı: ESP8266, API'den 200 OK yanıtı alırsa yeşil LED yakıp buzzer'dan (mini hoparlör) bir "Bip" sesi çıkaracak. Öğrenci "Tamam, okudu" deyip geçecek. Eğer 403 Forbidden (Kayıp Kart) alırsa kırmızı LED yanıp "Biiiip-Biiiip" ötecek.
Koordinatör Ekranı (WebSockets / Server-Sent Events): Aynı anda Koordinatör Dashboard ekranına bakıyorsa, sayfa yenilenmesine gerek kalmadan "Ahmet Yılmaz Yoklamaya Katıldı" bildirimi ekrana (Toast mesajı olarak) anlık düşecek ve Gelen/Gelmeyen grafiğindeki rakam canlı olarak 1 artacak.
BÖLÜM 4: İzolasyon Uyarıları (Cron Job)
Sistem arka planda sürekli uyumadan çalışmalı. Bunun için Node.js içinde bir node-cron görevi (Zamanlanmış Görev) yazacağız:
Ne zaman çalışacak? Her Cuma saat 18:00'de.
Ne yapacak? Tüm öğrencilerin son 3 haftadaki Attendance (Yoklama) kayıtlarını tarayacak.
Aksiyon: Eğer bir öğrencinin son 3 haftadaki tüm kayıtları ABSENT (Gelmedi) ise, o öğrencinin veritabanındaki isAtRisk değişkenini true yapacak.
Pazartesi sabahı Koordinatör sisteme girdiğinde, Dashboard'un en üstünde kırmızı bir kutu içinde "Acil İletişime Geçilmesi Gereken 60+ Yaşlılarımız" listesini görecek.
