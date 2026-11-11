import { useRef, useState } from "react";
import { Database, Download, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportBackup, importBackup } from "@/local-api/backup";

export function BackupCard() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      await exportBackup();
      toast({ title: "تم تجهيز النسخة الاحتياطية" });
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (!/cancel/i.test(msg)) toast({ title: "تعذّر إنشاء النسخة", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm("سيتم استبدال كل البيانات الحالية ببيانات النسخة الاحتياطية. هل تريد المتابعة؟")) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy("import");
    try {
      await importBackup(file);
      toast({ title: "تمت الاستعادة بنجاح" });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast({ title: "فشلت الاستعادة", description: (err as Error)?.message, variant: "destructive" });
      setBusy(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" />
          النسخ الاحتياطي والاستعادة
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          بياناتك محفوظة داخل هذا الهاتف فقط. احفظ نسخة احتياطية بشكل دوري (واتساب، Google Drive...) حتى لا تضيع
          البيانات عند حذف التطبيق أو تغيير الهاتف.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleExport} disabled={busy !== null} className="gap-2">
          <Download className="h-4 w-4" />
          {busy === "export" ? "جارٍ التجهيز..." : "حفظ نسخة احتياطية"}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null} className="gap-2">
          <Upload className="h-4 w-4" />
          {busy === "import" ? "جارٍ الاستعادة..." : "استعادة من ملف"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </CardContent>
    </Card>
  );
}
