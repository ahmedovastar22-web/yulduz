# AI Cloud Studio (demo)

Video generatsiya, subtitr va montaj, foto retush hamda kredit/obuna tizimi uchun boshqaruv paneli. Hozirgi versiya **to‘liq brauzerda ishlaydigan demo**: serversiz, kutubxonasiz, build qadamisiz.

## Ishga tushirish
`index.html` faylini brauzerda oching. Yoki papkada oddiy server ishga tushiring:

```
python3 -m http.server 8000
```

so‘ng `http://localhost:8000` manziliga kiring.

## Bo‘limlar
| Bo‘lim | Demo'da nima ishlaydi |
|---|---|
| Boshqaruv paneli | Balans, tarif, bajarilgan ishlar, modullar bo‘yicha foydalanish, so‘nggi harakatlar |
| AI video | G‘oya matni, davomiylik/format/uslub tanlash, canvas animatsiyasi, WebM yuklab olish |
| Subtitr va montaj | O‘z videongizni ochish, matndan subtitr qatorlari yaratish va tahrirlash, `.srt` yuklab olish, kesish va tezlikni ko‘rib chiqish, montaj rejasini (`.json`) yuklab olish |
| AI retush | Rasm yuklash, yorug‘lik/kontrast/to‘yinganlik/iliqlik/silliqlash, tayyor presetlar, asl rasm bilan solishtirish, PNG yuklab olish |
| Kredit va tariflar | Bepul / Pro / Biznes tariflari, oylik/yillik narx, kredit paketlari, kredit tarixi |

Har bir amal kredit sarflaydi (AI video 5 soniyasi 10, subtitr 5, montaj rejasi 3, retush yuklash 2). Holat `localStorage`da saqlanadi.

## Fayllar
- `index.html`: sahifa tuzilmasi va 5 ta bo‘lim
- `style.css`: dizayn (qorong‘i mavzu, mobil moslashuv)
- `app.js`: barcha mantiq (holat, kredit, video, subtitr, retush)

## Demo chegaralari (keyingi bosqich)
- Haqiqiy AI video modeli ulanmagan: natija oddiy animatsiya.
- Subtitr ovozdan emas, siz yozgan matndan yaratiladi. Haqiqiy nutqni matnga aylantirish (ASR) yo‘q.
- Montaj tayyor video fayl chiqarmaydi, faqat ko‘rib chiqish va reja faylini beradi.
- Retush oddiy rang filtrlari, yuzni aniqlash va AI modeli yo‘q.
- To‘lov tizimi, foydalanuvchi akkauntlari va server yo‘q: tarif va kredit tanlansa, to‘lovsiz balansga qo‘shiladi.
- API kalitlarni hech qachon GitHub'ga yuklamang (`.env` fayllari `.gitignore`da).
