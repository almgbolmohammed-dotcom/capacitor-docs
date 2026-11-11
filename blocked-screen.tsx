import { ShieldOff } from "lucide-react";

interface BlockedScreenProps {
  tenantName?: string;
}

export function BlockedScreen({ tenantName }: BlockedScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-4">
        <div className="bg-destructive/10 rounded-full p-6">
          <ShieldOff className="h-16 w-16 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">الحساب موقوف</h1>
          {tenantName && (
            <p className="text-muted-foreground text-sm">مكتب: {tenantName}</p>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">
            تم إيقاف هذا المكتب مؤقتاً من قِبَل الإدارة.
            يرجى التواصل مع الدعم لإعادة التفعيل.
          </p>
        </div>
        <div className="bg-muted rounded-xl px-6 py-3 text-xs text-muted-foreground">
          رمز المكتب: {window.location.pathname.split("/")[2] || "—"}
        </div>
      </div>
    </div>
  );
}
