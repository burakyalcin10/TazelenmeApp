# TazelenmeApp Demo Script

Bu script, hocalara projeyi hem kullanici ozellikleri hem de teknik mimari olarak anlatmak icin hazirlandi. Demo sirasinda hedef, once problemi ve degeri gostermek, sonra calisan ozellikleri akici bir senaryo ile kanitlamak.

## 0. Sunum Oncesi Hazirlik

### Uygulamayi baslat

```powershell
cd C:\Users\burak\OneDrive\Masaustu\TazelenmeApp
docker compose up -d
```

Backend saglik kontrolu:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Frontend:

```text
http://localhost:3000
```

Admin girisi:

```text
TC No: 11111111111
PIN: 1234
```

### RFID demo hazirligi

Pi ag kontrolu:

```powershell
ssh burak@rfid-pi.local
```

RFID servis kontrolu:

```bash
systemctl status tazelenme-rfid
```

Mobil hotspot / iPhone aginda tunnel:

```powershell
python tools\rfid_gateway\reverse_tunnel.py --host rfid-pi.local --user burak --password burak --remote-host 127.0.0.1 --remote-port 4000 --local-host 127.0.0.1 --local-port 4000
```

Basarili cikti:

```text
remote 127.0.0.1:4000 -> local 127.0.0.1:4000
```

Kapanmasi gerekirse:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'python.exe'" |
  Where-Object { $_.CommandLine -like '*reverse_tunnel.py*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## 1. Acilis Konusmasi

### Anlatim

"Bu projede Tazelenme Universitesi icin ogrenci, ders, sinif, materyal, yoklama ve raporlama sureclerini tek bir web uygulamasinda topladim. Sistem iki ana kullaniciya hizmet ediyor: koordinasyon ekibi icin operasyon paneli, ogrenciler icin sade bir portal. Ayrica yoklama surecini manuel isaretleme yaninda Raspberry Pi ve RC522 RFID okuyucu ile fiziksel kart okutmaya kadar calisir hale getirdim."

### Teknik karsiligi

- Frontend: Next.js App Router, React, Tailwind, PWA uyumlu ogrenci portali.
- Backend: Express ve TypeScript tabanli REST API.
- Veritabani: PostgreSQL ve Prisma ORM.
- Altyapi: Docker Compose ile frontend, backend ve database servisleri.
- IoT: Raspberry Pi, RC522, Python RFID gateway, reverse SSH tunnel.

## 2. Login ve Rol Bazli Yonlendirme

### Goster

1. Login ekranini ac.
2. Admin hesabi ile giris yap.
3. Admin dashboard'a yonlendirildigini goster.
4. Ogrenci hesabi ile giris mantigini anlat.

### Anlatim

"Sistem admin ve ogrenci icin ayni giris ekranini kullaniyor. Kullanici rolune gore admin paneline ya da ogrenci portalina yonlendiriliyor. Ogrenci hesaplarinda ilk PIN, TC kimlik numarasinin son dort hanesi olacak sekilde tasarlandi; bu da ilk kullanim icin basit bir akil tutulabilir giris yontemi sagliyor."

### Teknik karsiligi

- JWT access token ve refresh token akisi kullaniliyor.
- Role-based redirect ile admin ve ogrenci deneyimleri ayriliyor.
- Frontend API isteklerini `/api/v1/*` proxy rotasindan backend'e iletiyor.

## 3. Dashboard ve Operasyon Ozeti

### Goster

1. Dashboard kartlarini ac.
2. Ogrenci, ders, oturum ve katilim ozetlerini anlat.
3. Bildirim veya risk alanlari varsa isaret et.

### Anlatim

"Dashboard koordinatore sistemin genel sagligini tek bakista veriyor. Burada toplam ogrenci, ders ve katilim ozeti gibi operasyonel metrikleri gorerek gunluk is akisini hizli takip edebiliyoruz."

### Teknik karsiligi

- Backend tarafinda farkli modullerden ozet veriler toplanir.
- Frontend dashboard bu verileri okunabilir kartlar ve listeler halinde sunar.
- Amac, koordinasyon ekibinin detay sayfalarina girmeden once genel durumu anlayabilmesidir.

## 4. Ogrenci Yonetimi

### Goster

1. Ogrenci listesini ac.
2. Arama/filtreleme varsa kullan.
3. Bir ogrenci detayina gir.
4. Iletisim, saglik notu, ders kayitlari ve RFID kart bilgisini goster.

### Anlatim

"Ogrenci yonetimi modulunde kayitli ogrencilerin temel bilgileri, iletisim bilgileri, acil durum kisisi, saglik notlari, ders kayitlari ve RFID kartlari tek profilde toplanir. Bu sayede koordinasyon ekibi hem akademik hem de operasyonel bilgiyi ayni ekrandan takip eder."

### Teknik karsiligi

- Ogrenci bilgileri `users` ve `student_profiles` tablolarinda tutulur.
- Ders kayitlari `enrollments` uzerinden ogrenciyle iliskilidir.
- RFID kartlari `rfid_cards` tablosu ile ogrenci profiline baglanir.
- CSV import/export destegi toplu veri girisi icin kullanilir.

## 5. Ders, Sinif ve Oturum Yonetimi

### Goster

1. Dersler ekranini ac.
2. Bir dersin sinif, kontenjan, donem ve oturum bilgisini goster.
3. Haftalik oturum mantigini anlat.
4. Ogrencilerin derse kayit edilmesini goster veya anlat.

### Anlatim

"Ders yonetimi tarafinda dersler donem bilgisiyle tanimlaniyor. Her ders sinif ve haftalik oturumlarla baglaniyor. Boylece sistem sadece ogrenci listesi tutmuyor, dersin nerede ve ne zaman islenecegini de biliyor. Yoklama da bu acik oturumlar uzerinden aliniyor."

### Teknik karsiligi

- `courses`: ders bilgileri.
- `classrooms`: sinif, lokasyon ve kapasite.
- `lesson_sessions`: dersin tarih, saat ve sinif bazli oturumlari.
- `enrollments`: ogrencinin derse kayit iliskisi.

## 6. Materyal ve Mini-LMS

### Goster

1. Ders materyalleri ekranini ac.
2. PDF, video veya link materyali ekleme/listeleme akisini anlat.
3. Ogrenci portalinda materyale erisimi goster.

### Anlatim

"Proje sadece yoklama sistemi degil; ders materyali yonetimini de iceriyor. Koordinator derslere PDF, video veya link ekleyebiliyor. Ogrenci kendi portalindan sadece kayitli oldugu derslerin materyallerine erisebiliyor."

### Teknik karsiligi

- Materyaller `course_materials` tablosunda dersle iliskili tutulur.
- Dosya yuklemeleri backend'de upload storage ile yonetilir.
- PDF indirme akisi binary-safe proxy uzerinden calisir.

## 7. Yoklama Baslatma ve Manuel Yoklama

### Goster

1. Yoklama ekranina gir.
2. Bir oturum sec.
3. Yoklamayi baslat.
4. Bir ogrenciyi manuel `Geldi`, `Gelmedi` veya `Izinli` isaretle.
5. Onay dialog'unu goster.

### Anlatim

"Yoklama ekraninda koordinatör acik oturumu secerek yoklamayi baslatabiliyor. Manuel isaretleme icin onay mekanizmasi var; bu, yanlislikla durum degistirme riskini azaltir. Liste canli yenilendigi icin RFID okutma veya manuel degisiklikler hizli gorunur."

### Teknik karsiligi

- Yoklama kayitlari `attendances` tablosunda tutulur.
- Durumlar `PRESENT`, `ABSENT`, `EXCUSED` gibi kontrollu degerlerdir.
- Manuel isaretlemede audit log uretilerek operasyonel izlenebilirlik saglanir.
- Frontend belirli araliklarla yoklama listesini yeniler.

## 8. RFID Kart ile Yoklama

### Goster

1. Tunnel acik oldugunu kontrol et.
2. Admin panelde yoklama oturumunu acik tut.
3. Karti RC522 okuyucuya okut.
4. Ogrencinin otomatik `Geldi / RFID` oldugunu goster.
5. Ayni kart tekrar okutulursa tekrarli kayit olusmadigini anlat.

### Anlatim

"RFID demosunda Raspberry Pi uzerindeki RC522 okuyucu kart UID'sini okuyor. Pi'deki Python gateway bu UID'yi backend'e gonderiyor. Backend kartin hangi ogrenciye ait oldugunu buluyor, ogrencinin kayitli oldugu acik oturumu tespit ediyor ve yoklamayi otomatik olarak `Geldi` yapıyor."

### Teknik karsiligi

- Pi tarafinda `tazelenme-rfid` systemd servisi calisir.
- `rfid_gateway.py` kart UID'sini okur ve backend API'ye HTTP istegi atar.
- Pi, backend'e `127.0.0.1:4000` uzerinden gider; bu adres reverse SSH tunnel ile bilgisayardaki backend'e baglanir.
- `TAZELENME_DEVICE_LOCATION=AUTO` ayari sayesinde Pi'de sinif kodu degistirmeye gerek kalmaz.
- Backend anti-passback mantigi ile ayni oturum icin tekrarli yoklama kaydi olusturmaz.

### RFID hata senaryolari

- Kayitsiz kart okutulursa sistem "Kayitsiz Kart" uyarisi verir.
- Kayip veya iptal kart okutulursa bildirim uretir.
- Tunnel kapaliysa Pi backend'e ulasamaz; tunnel komutu tekrar calistirilir.

## 9. Bildirimler ve Risk Takibi

### Goster

1. Bildirimler ekranini ac.
2. Devamsizlik veya kart uyarisi gibi bildirimleri anlat.
3. Riskli ogrenci takibinin amacini acikla.

### Anlatim

"Bildirim sistemi, koordinasyon ekibinin dikkat etmesi gereken olaylari gorunur hale getirir. Ornegin devamsizlik riski, kayip kart okutma veya iptal kart kullanimi gibi durumlar operasyonel uyarilara donusur."

### Teknik karsiligi

- Bildirimler `notifications` tablosunda tutulur.
- Kritik olaylar backend servis katmaninda uyarıya donusturulur.
- Bu yapi daha sonra e-posta, SMS veya push notification gibi kanallara genisletilebilir.

## 10. Raporlama

### Goster

1. Raporlar ekranini ac.
2. Katilim ve gecme/kalma rapor mantigini anlat.
3. Koordinatorun raporu nasil kullanacagini acikla.

### Anlatim

"Raporlama modulu, donem sonunda ya da ara takiplerde ogrenci katilimini analiz etmek icin kullaniliyor. Sistem katilim oranlarini ve devamsizlik durumunu daha hizli gorunur hale getiriyor."

### Teknik karsiligi

- Yoklama kayitlari ders, oturum ve ogrenci iliskileriyle birlikte sorgulanir.
- Raporlar backend'de filtrelenebilir veri setleri olarak uretilir.
- Koordinator, katilim ve risk durumlarini merkezi olarak takip eder.

## 11. Ogrenci Portali ve PWA Deneyimi

### Goster

1. Ogrenci hesabiyla giris akisini anlat veya goster.
2. Ogrencinin kendi derslerini gormesini goster.
3. Devamsizlik ve materyal erisim ekranlarini anlat.

### Anlatim

"Ogrenci portali daha sade tasarlandi. Hedef kullanici kitlesi 60 yas ustu oldugu icin ogrencinin sadece ihtiyaci olan bilgilere kolay erismesini onceliklendirdim: dersleri, materyalleri ve devamsizlik durumu."

### Teknik karsiligi

- Admin paneli ve ogrenci portali ayni Next.js uygulamasi icindedir.
- Role-based routing ile farkli ekranlar sunulur.
- PWA uyumu sayesinde mobil cihazlarda uygulama gibi kullanilabilir.

## 12. Mimariyi Ozetleme

### Anlatim

"Mimariyi uc katman olarak dusunebiliriz. Frontend kullanici deneyimini sagliyor, backend is kurallarini ve API'leri yonetiyor, PostgreSQL veriyi tutuyor. RFID tarafinda ise Raspberry Pi fiziksel dunyadan kart bilgisini alıp backend'e iletiyor. Reverse tunnel, sunum ortaminda firewall veya farkli ag problemi yasamadan Pi'nin bilgisayardaki backend'e ulasmasini sagliyor."

### Teknik karsiligi

```text
Frontend (Next.js)
  -> Backend API (Express + TypeScript)
    -> PostgreSQL (Prisma)
    -> RFID API endpointleri
Raspberry Pi + RC522
  -> Python RFID Gateway
  -> Reverse SSH Tunnel
  -> Local Backend
```

## 13. Kapanis

### Anlatim

"Bu projede amacim sadece ekranlari olan bir CRUD uygulamasi yapmak degildi. Tazelenme Universitesi'nin gercek operasyon ihtiyacini; ogrenci takibi, ders planlama, materyal paylasimi, yoklama, raporlama ve fiziksel RFID entegrasyonu ile uctan uca calisan bir sisteme donusturmekti. Demo ettigim akista web uygulamasi, veritabani, backend servisleri ve Raspberry Pi donanimi birlikte calisiyor."

### Vurgulanacak guclu noktalar

- Uctan uca calisan full-stack mimari.
- Gercek donanim entegrasyonu: Raspberry Pi + RC522.
- Manuel ve RFID yoklama seçenekleri.
- Role-based admin ve ogrenci deneyimi.
- Docker ile kolay calistirma.
- PWA uyumlu ogrenci portali.
- Raporlama ve operasyonel bildirim altyapisi.

## 14. Soru Gelirse Kisa Cevaplar

### "Internet giderse ne olur?"

"Ayni yerel agda bilgisayar, Pi ve uygulama calisiyorsa RFID demo yerel olarak devam eder. Mobil hotspot senaryosu icin tunnel komutunu `rfid-pi.local` ile kullaniyorum."

### "RFID kart kopyalanirsa ne olur?"

"Sistem UID bazli calisiyor. Kayip veya iptal kartlar backend'de pasif hale getirilebilir. Daha guvenli kart tipleri ve ek dogrulama ileride eklenebilir."

### "Ayni ogrenci iki kez kart okutursa ne olur?"

"Anti-passback mantigi sayesinde ayni oturum icin tekrarli yoklama olusmaz. Sistem var olan kaydi korur veya gerekiyorsa gunceller."

### "Neden Raspberry Pi kullandiniz?"

"Cunku RC522 gibi fiziksel okuyucularla kolay haberlesiyor, Python servis olarak surekli calisabiliyor ve demo ortaminda tasinabilir bir IoT gateway gorevi goruyor."

### "Sistem genisletilebilir mi?"

"Evet. Backend moduler controller/service yapisinda, veritabani Prisma ile yonetiliyor. Bildirim kanallari, farkli kart okuyucular, daha detayli raporlar veya mobil push bildirimler eklenebilir."

## 15. Demo Sirasinda Pratik Akis

1. Admin girisi yap.
2. Dashboard'u goster.
3. Ogrenci listesinden bir ogrenci detayina gir.
4. RFID kart bilgisini goster.
5. Dersler ve oturum yapisini anlat.
6. Materyal ekranini goster.
7. Yoklama ekraninda oturum baslat.
8. Manuel yoklama ile bir ogrenci isaretle.
9. Tunnel acik oldugunu kontrol et.
10. RFID kart okut.
11. Ogrencinin `Geldi / RFID` oldugunu goster.
12. Ayni karti tekrar okut, tekrarli kayit olusmadigini anlat.
13. Raporlar ve ogrenci portalini goster.
14. Mimariyi ozetle.
15. Kapanis cumlesiyle projeyi gercek ihtiyac ve teknik entegrasyon olarak bagla.
