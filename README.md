# تأجير السيارات — تطبيق أندرويد (APK) يعمل بدون سيرفر

نفس تطبيقك الأصلي (React + مسارات Express + Drizzle/PostgreSQL) لكن:

- **بدون Replit وبدون سيرفر وبدون إنترنت**: مسارات الخادم الأصلية تعمل داخل التطبيق نفسه.
- **البيانات محفوظة في الهاتف**: قاعدة PostgreSQL كاملة (PGlite) داخل التطبيق، تبقى بعد إغلاقه وإعادة تشغيل الهاتف.
- **نسخ احتياطي واستعادة**: الإعدادات ← «المكتب والبيانات» ← «حفظ نسخة احتياطية» (ملف JSON تشاركه على واتساب/Drive).

## نشره كموقع (رابط يفتح من أي متصفح)

1. ارفع المشروع إلى مستودع GitHub.
2. من **Settings ← Pages** اختر **Source: GitHub Actions**.
3. شغّل **Actions ← Deploy website (GitHub Pages) ← Run workflow**.
4. يظهر الرابط في نهاية التشغيل (مثل `https://اسمك.github.io/اسم-المستودع/`). افتحه من الهاتف وأضفه للشاشة الرئيسية.

البيانات تُحفظ داخل متصفح الجهاز نفسه (لا ترفع لأي سيرفر).

## الطريقة الأسهل: بناء الـ APK على GitHub (بدون تثبيت أي شيء على جهازك)

1. أنشئ مستودعاً جديداً على GitHub وارفع محتويات هذا المجلد كما هي.
2. افتح تبويب **Actions** ← **Build Android APK** ← **Run workflow**.
3. بعد 5–10 دقائق افتح التشغيل وحمّل الملف **car-rental-apk** ← بداخله `app-debug.apk`.
4. انقله للهاتف وثبّته (فعّل «التثبيت من مصادر غير معروفة»).

## البناء على جهازك

المتطلبات: Node 22+، JDK 21، Android Studio (أو Android SDK).

```bash
npm install
npm run build
npx cap add android        # مرة واحدة فقط
npx cap sync android
node scripts/prepare-android.mjs
cd android && ./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

للتجربة في المتصفح قبل البناء: `npm run dev`

## ما الذي تغيّر عن المشروع الأصلي؟

| الأصل | هنا |
|---|---|
| Express + PostgreSQL على Replit | نفس ملفات المسارات تعمل داخل التطبيق عبر `src/local-api/express-shim.ts` |
| `pg` + `DATABASE_URL` | PGlite (PostgreSQL WASM) في IndexedDB — `src/local-api/db.ts` |
| `drizzle-kit push` | إنشاء الجداول تلقائياً من نفس المخطط — `src/local-api/schema-sync.ts` |
| `fetch("/api/...")` إلى السيرفر | يُعترض ويُنفَّذ محلياً — `src/local-api/fetch-bridge.ts` |
| لوحة السوبر أدمن + WebSocket | أُزيلت (للسيرفر فقط)؛ التطبيق يفتح مباشرة على المكتب `main` |
| روابط المشاركة | أُخفيت (تحتاج سيرفر ليصل إليه الآخرون) |
| خط Tajawal من Google | مضمَّن داخل التطبيق (يعمل بدون إنترنت) |

## تنبيهات مهمة

- **حذف التطبيق أو «مسح البيانات» من إعدادات أندرويد يمسح قاعدة البيانات.** خذ نسخة احتياطية دورياً.
- لنقل بياناتك الحالية من Replit: صدّرها من قاعدة PostgreSQL القديمة (أو أعد إدخالها)، فالنسخة الاحتياطية هنا بصيغة JSON خاصة بالتطبيق (`{ format: "car-rental-backup", tables: { اسم_الجدول: [صفوف] } }`).
- يتطلب أندرويد 7+ مع «Android System WebView» محدّثاً.
- الملف الناتج `app-debug.apk` موقَّع بمفتاح التطوير؛ مناسب للتثبيت المباشر. للنشر على Google Play تحتاج توقيع Release بمفتاحك الخاص.
