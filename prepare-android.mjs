// يعدّل مشروع أندرويد المُولَّد بواسطة Capacitor (يُشغَّل تلقائياً قبل البناء)
import fs from "node:fs";
import path from "node:path";

const manifest = path.resolve("android/app/src/main/AndroidManifest.xml");
if (!fs.existsSync(manifest)) {
  console.error("android/ غير موجود. شغّل أولاً: npx cap add android");
  process.exit(1);
}

let xml = fs.readFileSync(manifest, "utf8");

// قاعدة البيانات المحلية (PostgreSQL داخل التطبيق) تحتاج ذاكرة أكبر قليلاً
if (!xml.includes("android:largeHeap")) {
  xml = xml.replace("<application", '<application\n        android:largeHeap="true"');
}
// الاتجاه: يسمح بالتدوير ويحافظ على الحالة
if (!xml.includes("android:screenOrientation")) {
  xml = xml.replace("<activity", '<activity\n            android:screenOrientation="unspecified"');
}
fs.writeFileSync(manifest, xml);

// اسم التطبيق بالعربية
const strings = path.resolve("android/app/src/main/res/values/strings.xml");
if (fs.existsSync(strings)) {
  let s = fs.readFileSync(strings, "utf8");
  s = s.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">تأجير السيارات</string>');
  s = s.replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">تأجير السيارات</string>');
  fs.writeFileSync(strings, s);
}
console.log("✔ android project prepared");
