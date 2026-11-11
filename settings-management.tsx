import { useEffect, useState } from "react";
import { customFetch, useListCars } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { Check, ClipboardList, Copy, Link2, Trash2 } from "lucide-react";

type Task = {
  id: number;
  title: string;
  type: string;
  status: string;
  assignee?: string | null;
  dueDate?: string | null;
  createdAt: string;
};

type ShareLink = {
  id: number;
  token: string;
  label: string;
  sections: string[];
  createdAt: string;
};

const sectionLabels: Record<string, string> = {
  dashboard: "الرئيسية والملخص",
  cars: "السيارات",
  rentals: "التأجيرات النشطة",
  completed: "الأنشطة المنتهية",
  alerts: "التنبيهات والمتابعة",
  contracts: "العقود",
  customers: "معلومات الزبائن",
  ownerAccounts: "حسابات ملاك السيارات",
  reports: "التقارير",
  income: "الدخل",
  accounts: "الحسابات",
  debts: "المديونية",
  tasks: "مهام الفريق",
  maintenance: "السيارات والصيانة",
  assistant: "المساعد الذكي",
};

const sectionDescriptions: Record<string, string> = {
  dashboard: "ملخص السيارات والتأجيرات والدخل",
  cars: "قائمة السيارات وحالتها",
  rentals: "التأجيرات النشطة وتفاصيلها",
  completed: "التأجيرات التي اكتملت",
  alerts: "التأجيرات التي تحتاج متابعة",
  contracts: "العقود المحفوظة",
  customers: "ملفات العملاء وبيانات التواصل",
  ownerAccounts: "حسابات ملاك السيارات",
  reports: "ملخصات وتقارير المكتب",
  income: "سجلات الدخل",
  accounts: "الدخل والمصروفات وصافي الحساب",
  debts: "المديونيات غير المسددة",
  tasks: "مهام النظافة والصيانة",
  maintenance: "السيارات وحالة الصيانة",
  assistant: "التحليل المالي والمساعد",
};

export function TeamTasksSettings() {
  const { data: cars = [] } = useListCars();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("cleaning");
  const [assignee, setAssignee] = useState("");
  const [carId, setCarId] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTasks() {
    try {
      setTasks(await customFetch<Task[]>("/api/smart-tasks"));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر تحميل المهام", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await customFetch("/api/smart-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          assignee: assignee.trim() || undefined,
          carId: carId ? Number(carId) : null,
        }),
      });
      setTitle("");
      setAssignee("");
      setCarId("");
      await loadTasks();
      toast({ title: "تم إنشاء المهمة" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر إنشاء المهمة", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(task: Task, status: string) {
    try {
      await customFetch(`/api/smart-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadTasks();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر تحديث المهمة", variant: "destructive" });
    }
  }

  async function removeTask(id: number) {
    try {
      await customFetch(`/api/smart-tasks/${id}`, { method: "DELETE" });
      await loadTasks();
      toast({ title: "تم حذف المهمة" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر حذف المهمة", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          توزيع مهام الصيانة والنظافة
        </CardTitle>
        <p className="text-sm text-muted-foreground">أنشئ المهام وحدد الموظف والسيارة، ثم تابع حالة التنفيذ.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid items-end gap-2 md:grid-cols-[1fr_150px_170px_170px_auto]">
          <div>
            <label className="text-sm">المهمة</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: تنظيف السيارة بعد التسليم" />
          </div>
          <div>
            <label className="text-sm">النوع</label>
            <select className="h-10 w-full rounded-md border bg-background px-2" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="cleaning">نظافة</option>
              <option value="maintenance">صيانة</option>
              <option value="inspection">فحص</option>
              <option value="general">عام</option>
            </select>
          </div>
          <div>
            <label className="text-sm">الموظف</label>
            <Input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="اسم الموظف" />
          </div>
          <div>
            <label className="text-sm">السيارة</label>
            <select className="h-10 w-full rounded-md border bg-background px-2" value={carId} onChange={(event) => setCarId(event.target.value)}>
              <option value="">بدون سيارة</option>
              {cars.map((car) => <option key={car.id} value={car.id}>{car.model} - {car.plateNumber}</option>)}
            </select>
          </div>
          <Button onClick={addTask} disabled={saving || !title.trim()}>إضافة</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">جارٍ تحميل المهام...</p>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">لا توجد مهام بعد.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Badge variant={task.status === "completed" ? "secondary" : "outline"}>
                  {task.type === "cleaning" ? "نظافة" : task.type === "maintenance" ? "صيانة" : task.type === "inspection" ? "فحص" : "عام"}
                </Badge>
                <span className={`flex-1 font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
                {task.assignee && <span className="text-sm text-muted-foreground">{task.assignee}</span>}
                <select className="h-8 rounded-md border bg-background px-2 text-sm" value={task.status} onChange={(event) => updateStatus(task, event.target.value)}>
                  <option value="pending">معلقة</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتملة</option>
                </select>
                <Button variant="ghost" size="icon" onClick={() => removeTask(task.id)} aria-label="حذف المهمة">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ShareLinksSettings() {
  const { slug } = useTenant();
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [sections, setSections] = useState<string[]>(["completed"]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadLinks() {
    try {
      setLinks(await customFetch<ShareLink[]>("/api/share-links"));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر تحميل روابط المشاركة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLinks();
  }, []);

  function toggle(section: string) {
    setSections((current) => current.includes(section)
      ? current.filter((item) => item !== section)
      : [...current, section]);
  }

  async function createLink() {
    if (!label.trim() || !sections.length) return;
    setSaving(true);
    try {
      await customFetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), sections }),
      });
      setLabel("");
      await loadLinks();
      toast({ title: "تم إنشاء رابط المشاركة" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر إنشاء الرابط", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(id: number) {
    try {
      await customFetch(`/api/share-links/${id}`, { method: "DELETE" });
      await loadLinks();
      toast({ title: "تم حذف الرابط" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "تعذر حذف الرابط", variant: "destructive" });
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}/shared/${token}`);
      toast({ title: "تم نسخ الرابط" });
    } catch {
      toast({ title: "تعذر نسخ الرابط", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          روابط المشاركة المقيدة
        </CardTitle>
        <p className="text-sm text-muted-foreground">اختر الأقسام التي يستطيع العامل فتحها؛ ستُخفى الأقسام الأخرى ويُمنع الوصول إليها.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="مثال: رابط موظف الحسابات" />
          <Button onClick={createLink} disabled={saving || !label.trim() || !sections.length}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء الرابط"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(sectionLabels).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`rounded-lg border p-3 text-right transition-colors ${sections.includes(key) ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
            >
              <span className="flex items-center gap-2 font-medium">
                {sections.includes(key) && <Check className="h-4 w-4 text-primary" />}
                {text}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{sectionDescriptions[key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل الروابط...</p>
        ) : links.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">لا توجد روابط مشاركة بعد.</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <span className="flex-1 font-medium">{link.label}</span>
                <div className="flex flex-wrap gap-1">
                  {link.sections.map((section) => <Badge key={section} variant="outline">{sectionLabels[section] ?? section}</Badge>)}
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => copyLink(link.token)}>
                  <Copy className="h-3 w-3" />نسخ
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)} aria-label="حذف رابط المشاركة">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}