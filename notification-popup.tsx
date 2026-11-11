import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationPopupProps {
  message: string;
  onDismiss: () => void;
}

export function NotificationPopup({ message, onDismiss }: NotificationPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      dir="rtl"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-card border-2 border-primary rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-3">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">إشعار من الإدارة</h2>
            <p className="text-xs text-muted-foreground">رسالة مهمة تستلزم الإطلاع</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed min-h-[60px]">
          {message}
        </div>

        <Button
          onClick={onDismiss}
          className="w-full h-11 text-base font-semibold"
        >
          موافق، تم الإطلاع
        </Button>
      </div>
    </div>
  );
}
