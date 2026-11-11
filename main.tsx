import { createRoot } from "react-dom/client";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./index.css";
import { installLocalApi } from "./local-api/fetch-bridge";
import { ensureDb } from "./local-api/db";

const root = createRoot(document.getElementById("root")!);

function Splash({ text }: { text: string }) {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Tajawal, sans-serif", color: "#475569" }}>
      {text}
    </div>
  );
}

async function bootstrap() {
  root.render(<Splash text="جارٍ تجهيز قاعدة البيانات..." />);
  // كل طلبات /api تُنفَّذ الآن داخل الهاتف على قاعدة البيانات المحلية
  installLocalApi();
  await ensureDb();
  const { default: App } = await import("./App");
  root.render(<App />);
}

bootstrap().catch((err) => {
  console.error(err);
  root.render(
    <div dir="rtl" style={{ padding: 24, fontFamily: "Tajawal, sans-serif" }}>
      <h2 style={{ color: "#b91c1c" }}>تعذّر فتح قاعدة البيانات</h2>
      <p style={{ marginTop: 8 }}>تأكد من تحديث «Android System WebView» ثم أعد تشغيل التطبيق.</p>
      <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 12, color: "#64748b" }}>{String((err as Error)?.message ?? err)}</pre>
    </div>,
  );
});
