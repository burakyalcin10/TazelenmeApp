# Android NFC Yoklama Gecis Plani

## Karar

Raspberry Pi + RC522 + Python gateway yerine, Android telefonun dahili NFC
okuyucusunu kullanan yerel bir uygulama kullanilacaktir. Telefon kart UID'sini
okur ve backend'e admin JWT ile `POST /api/v1/attendance/mobile-scan` istegi
gonderir.

```text
RFID/NFC kart (13.56 MHz, ISO 14443-A)
  -> Android NFC reader mode
    -> Tazelenme NFC Android uygulamasi
      -> HTTPS + admin JWT
        -> Express /api/v1/attendance/mobile-scan
          -> mevcut kart, aktif oturum ve enrollment kontrolleri
            -> PostgreSQL attendance (PRESENT / RFID)
```

Raspberry Pi rotasi (`/api/v1/attendance/scan`) geriye uyumluluk icin kalir.
Boylece gecis ve fiziksel testler tamamlanana kadar eski okuyucu yedek olarak
kullanilabilir.

## Neden PWA / Web NFC degil?

Mevcut frontend PWA'dir; ancak Web NFC yalnizca NDEF kapsamini destekler.
Dusuk seviyeli NFC-A erisimi yoktur. RC522 ile UID'si okunan bos veya NDEF
olarak hazirlanmamis MIFARE kartlari icin bu, telefon ve kart modeline bagli
kirilgan bir akis olusturur. Yerel Android API'si `Tag.getId()` ve NFC-A reader
mode ile NDEF gerektirmeden UID okuyabilir.

## Donanim uyumlulugu

- RC522, 13.56 MHz ISO/IEC 14443-A, MIFARE ve NTAG kartlarla calisir.
- Android NFC cihazlarinda NFC-A (`NfcA`) destegi zorunludur.
- Mevcut RC522 gateway yalniz ilk cascade seviyesindeki 4 UID baytini
  birlestirir. Android ise etiketin tum UID baytlarini dondurur.
- Mevcut fiziksel kartlar 4 bayt UID kullaniyorsa Android ve Pi sonucu ayni
  8 hex karakter olmalidir. 7 veya 10 bayt UID kartlarda once fiziksel
  karsilastirma yapilmali ve kartlar Android'in tam UID degeriyle yeniden
  kaydedilmelidir.
- 125 kHz EM4100/Proximity kartlar telefonla okunamaz. Bu kartlar RC522 ile de
  uyumlu degildir; sistemde gercekten RC522 ile calisan kartlar kullaniliyorsa
  bu risk beklenmez.

## Kimlik dogrulama ve guvenlik

- APK icine global `IOT_API_KEY` gomulmez.
- Koordinator TC/PIN ile giris yapar; mobil tarama rotasi yalniz `ADMIN` JWT
  kabul eder.
- Access ve refresh token Android Keystore ile uretilen, uygulamaya ozel
  AES-GCM anahtariyla sifrelenerek saklanir.
- Release APK HTTP'yi reddeder ve HTTPS ister. Debug manifesti yerel agdaki
  `http://192.168.x.x:4000` testlerine izin verir.
- UID bir kimlik dogrulama sirri degildir ve klonlanabilir. Kayip/iptal kart
  kontrolu mevcut riski azaltir fakat yuksek guvenlik gerektiren senaryoda
  UID-only kart yerine kriptografik kart gerekir.

## Mevcut backend akisi nasil korunuyor?

Mobil rota mevcut `scanCard` is mantigini aynen kullanir:

1. UID ile kart kaydi bulunur.
2. `LOST` ve `REVOKED` kartlar reddedilir ve bildirim uretilir.
3. `AUTO` modunda kart sahibinin kayitli oldugu acik yoklama oturumu bulunur.
4. Ogrencinin derse kaydi kontrol edilir.
5. Ayni oturum/ogrenci icin ikinci kayit engellenir.
6. Kayit `PRESENT / RFID` olarak olusturulur veya guncellenir.

Tarama ve kart atama girislerinde UID `trim().toUpperCase()` ile kanonik hale
getirilir. Boylece Pi ve Android arasindaki harf buyuklugu farki kaydi bozmaz.

## Ilk surum kapsami

`android/` altindaki ilk surum:

- Backend adresini ayarlama
- Admin TC/PIN girisi
- Token yenileme
- NFC'nin kapali veya bulunmadigi durumu gosterme
- NFC-A reader mode ile UID okuma
- Ayni kart icin 4 saniyelik debounce
- `AUTO` lokasyonuyla yoklama gonderme
- Ogrenci, ders, tekrar kayit ve hata sonucunu ekranda gosterme
- UID'yi secilebilir metin olarak gosterme

Oturum secme/baslatma ilk surumde mevcut web admin panelinden yapilir. Mobil
uygulama yalniz okuyucu rolundedir. Sonraki dilimde telefondan oturum secme ve
baslatma eklenebilir.

## Kurulum

Gelistirme makinesinde Android Studio ve Android SDK 36 kurulmalidir. Proje
Android Studio'da `android/` klasorunden acilir.

Windows komut satiri derlemesi:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```

Debug APK `android/app/build/outputs/apk/debug/app-debug.apk` altinda olusur.

Debug APK yerel backend ile calisabilir:

```text
http://BILGISAYARIN_LAN_IP_ADRESI:4000
```

Telefon ve bilgisayar ayni Wi-Fi aginda olmali, Windows Firewall 4000 portuna
izin vermeli ve backend `0.0.0.0:4000` uzerinden dinlemelidir. Uretimde Render
veya baska bir genel backend HTTPS adresi kullanilir; Raspberry Pi reverse SSH
tuneline gerek kalmaz.

## Fiziksel kabul testi

1. Pi'de `rfid_gateway.py --once` ile bir kartin UID'sini kaydet.
2. Android uygulamasinda ayni karti okut ve ekrandaki UID ile karsilastir.
3. UID ayniysa karti admin panelinde bu UID ile aktif ogrenciye ata.
4. Web admin panelinde ogrencinin kayitli oldugu oturum icin yoklamayi baslat.
5. Kart okutuldugunda ogrencinin `PRESENT / RFID` oldugunu dogrula.
6. Ayni karti tekrar okut; yeni satir olusmamali ve "daha once alindi"
   mesaji gorulmeli.
7. `LOST`, `REVOKED`, kayitsiz kart, yanlis ders kaydi ve kapali oturum
   senaryolarini dogrula.
8. Ekran kilidi, ag kesintisi, token yenileme ve backend cold-start
   senaryolarini test et.

## Sonraki dilimler

1. Android SDK kurulu ortamda debug APK build ve gercek telefon smoke testi.
2. Uygulama icinde aktif oturum listeleme, secme, baslatma ve durdurma.
3. Ag kesintisinde imzali/yerel kuyruk ve kontrollu yeniden gonderim.
4. Backend'de cihaz kaydi, cihaz iptali ve mobil taramalar icin ayrintili audit.
5. Pilot sonrasi Pi gateway dokumanlarini "legacy fallback" olarak ayirma.

## Bilinen proje notlari

- Seed verisindeki `TZL-2026-0001` benzeri UID'ler demo metnidir; fiziksel kart
  UID'si degildir. Telefonla okutulan gercek hex UID admin panelinden ilgili
  ogrenciye atanmalidir.
- Bu makinede Android SDK Platform 36 tamamlandi; AGP 9.3.0 ve Gradle 9.6.1 ile
  debug APK build ve Android lint basariyla calisti. USB ile bagli telefon
  olmadigi icin gercek NFC kart testi henuz yapilmadi.
