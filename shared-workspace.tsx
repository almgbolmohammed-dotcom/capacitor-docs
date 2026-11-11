import { useEffect, useState } from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import {
  getListCarsQueryKey,
  getListRentalsQueryKey,
  customFetch,
  useListCars,
  useListRentals,
} from "@workspace/api-client-react";
import {
  AlertCircle,
  BarChart3,
  Car,
  CheckCircle,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import { ShareAccessProvider } from "@/contexts/share-access-context";
import { useTenant } from "@/contexts/tenant-context";
import { BlockedScreen } from "@/components/blocked-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import Dashboard from "@/pages/dashboard";
import Cars from "@/pages/cars";
import Rentals from "@/pages/rentals";
import Income from "@/pages/income";
import Debts from "@/pages/debts";
import Accounts from "@/pages/accounts";
import Contracts from "@/pages/contracts";
import Alerts from "@/pages/alerts";
import Reports from "@/pages/reports";
import Customers from "@/pages/customers";
import OwnerAccounts from "@/pages/owner-accounts";
import Assistant from "@/pages/assistant";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

interface ShareManifest {
  sections: string[];
}

const sectionPath: Record<string, string> = {
  dashboard: "/dashboard",
  cars: "/cars",
  rentals: "/rentals",
  completed: "/alerts",
  alerts: "/alerts",
  contracts: "/contracts",
  customers: "/customers",
  ownerAccounts: "/owner-accounts",
  accounts: "/accounts",
  income: "/income",
  debts: "/debts",
  reports: "/reports",
  assistant: "/assistant",
  tasks: "/tasks",
  maintenance: "/cars?tab=maintenance",
  settings: "/settings",
};

const sectionPresentation: Record<string, { title: string; icon: LucideIcon; accent: string; shortcut?: string }> = {
  dashboard: { title: "الرئيسية والملخص", icon: LayoutDashboard, accent: "#151b2c", shortcut: "Alt+H" },
  cars: { title: "السيارات المتاحة", icon: Car, accent: "#e0ad00", shortcut: "Alt+C" },
  rentals: { title: "التأجيرات النشطة", icon: Timer, accent: "#151b2c", shortcut: "Alt+R" },
  completed: { title: "الأنشطة المنتهية", icon: CheckCircle, accent: "#38a3d1", shortcut: "Alt+A" },
  alerts: { title: "التنبيهات والمتابعة", icon: AlertCircle, accent: "#e49b21", shortcut: "Alt+A" },
  contracts: { title: "العقود", icon: FileText, accent: "#9b61c8", shortcut: "Alt+K" },
  customers: { title: "معلومات الزبائن", icon: Users, accent: "#3980d2", shortcut: "Alt+U" },
  ownerAccounts: { title: "حسابات ملاك السيارات", icon: UserRound, accent: "#e49b21", shortcut: "Alt+O" },
  reports: { title: "التقارير", icon: TrendingUp, accent: "#1d9b8a", shortcut: "Alt+P" },
  income: { title: "الدخل", icon: Wallet, accent: "#24a36a", shortcut: "Alt+I" },
  accounts: { title: "الحسابات والمصروفات", icon: BarChart3, accent: "#24a36a", shortcut: "Alt+E" },
  debts: { title: "المديونية", icon: Receipt, accent: "#e34d58", shortcut: "Alt+D" },
  tasks: { title: "مهام الفريق", icon: ClipboardList, accent: "#4b82d1", shortcut: "Alt+M" },
  maintenance: { title: "السيارات والصيانة", icon: Wrench, accent: "#e0ad00", shortcut: "Alt+C" },
  assistant: { title: "المساعد الذكي", icon: Sparkles, accent: "#7457c8", shortcut: "Alt+Z" },
  settings: { title: "الإعدادات", icon: SettingsIcon, accent: "#65758b", shortcut: "Alt+S" },
};

export default function SharedWorkspace({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const [manifest, setManifest] = useState<ShareManifest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/share/${token}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid");
        return response.json() as Promise<ShareManifest>;
      })
      .then((result) => {
        if (!cancelled) setManifest(result);
      })
      .catch(() => {
        if (!cancelled) setError("الرابط غير صالح أو تم إيقافه");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive" dir="rtl">
        {error}
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <Skeleton className="h-10 w-52" />
      </div>
    );
  }

  return (
    <ShareAccessProvider token={token} sections={manifest.sections}>
      <SharedTenantWorkspace slug={slug} token={token} sections={manifest.sections} />
    </ShareAccessProvider>
  );
}

function SharedTenantWorkspace({
  slug,
  token,
  sections,
}: {
  slug: string;
  token: string;
  sections: string[];
}) {
  const { tenant, isLoading, isBlocked, notFound } = useTenant();
  const basePath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${slug}/shared/${token}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">جارٍ تحميل مساحة العمل...</p>
      </div>
    );
  }

  if (notFound) return <NotFound />;
  if (isBlocked) return <BlockedScreen tenantName={tenant?.name} />;

  return (
    <WouterRouter base={basePath}>
      <MainLayout allowedSections={sections} sharedMode>
        <Switch>
          <Route path="/" component={() => <SharedSectionsHome sections={sections} />} />
          {sections.includes("dashboard") && <Route path="/dashboard" component={Dashboard} />}
          {sections.includes("cars") && <Route path="/cars" component={Cars} />}
          {sections.includes("rentals") && <Route path="/rentals" component={Rentals} />}
          {sections.includes("income") && <Route path="/income" component={Income} />}
          {sections.includes("debts") && <Route path="/debts" component={Debts} />}
          {sections.includes("accounts") && <Route path="/accounts" component={Accounts} />}
          {sections.includes("contracts") && <Route path="/contracts" component={Contracts} />}
          {(sections.includes("alerts") || sections.includes("completed")) && (
            <Route path="/alerts" component={Alerts} />
          )}
          {sections.includes("reports") && <Route path="/reports" component={Reports} />}
          {sections.includes("customers") && <Route path="/customers" component={Customers} />}
          {sections.includes("ownerAccounts") && <Route path="/owner-accounts" component={OwnerAccounts} />}
          {sections.includes("assistant") && <Route path="/assistant" component={Assistant} />}
          {sections.includes("tasks") && <Route path="/tasks" component={SharedTeamTasks} />}
          {sections.includes("settings") && <Route path="/settings" component={Settings} />}
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
    </WouterRouter>
  );
}

function SharedSectionsHome({ sections }: { sections: string[] }) {
  const [, navigate] = useLocation();
  const canShowCars = sections.includes("cars");
  const canShowRentals = sections.includes("rentals");
  const { data: cars = [] } = useListCars({
    query: { enabled: canShowCars, queryKey: getListCarsQueryKey() },
  });
  const { data: rentals = [] } = useListRentals(
    { status: "active" },
    { query: { enabled: canShowRentals, queryKey: getListRentalsQueryKey({ status: "active" }) } },
  );

  const orderedSections = [...sections].sort((left, right) => {
    const order = ["rentals", "cars"];
    return (order.indexOf(left) === -1 ? 10 : order.indexOf(left)) -
      (order.indexOf(right) === -1 ? 10 : order.indexOf(right));
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">الأقسام المتاحة</h2>
        <p className="mt-1 text-muted-foreground">اختر قسمًا لعرض بيانات المكتب والعمل عليها</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {orderedSections.map((section) => {
          const presentation = sectionPresentation[section];
          const href = sectionPath[section];
          if (!presentation || !href) return null;

          const Icon = presentation.icon;
          const value =
            section === "cars" ? cars.filter((car) => car.isAvailable).length :
            section === "rentals" ? rentals.length :
            "فتح";
          const hint =
            section === "cars" ? `من أصل ${cars.length}` :
            section === "rentals" ? "اضغط للعرض" :
            "اضغط لفتح القسم";

          return (
            <Card
              key={section}
              role="button"
              tabIndex={0}
              aria-label={`فتح ${presentation.title}`}
              onClick={() => navigate(href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(href);
                }
              }}
              className="cursor-pointer border-t-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ borderTopColor: presentation.accent }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {presentation.title}
                </CardTitle>
                <Icon className="h-4 w-4 shrink-0" style={{ color: presentation.accent }} />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className={`text-3xl font-bold ${section === "income" ? "text-green-600" : section === "debts" ? "text-destructive" : ""}`}>
                  {value}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{hint}</p>
                  {presentation.shortcut && (
                    <kbd className="rounded border px-1 text-xs text-muted-foreground opacity-60">
                      {presentation.shortcut}
                    </kbd>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

type SharedTeamTask = {
  id: number;
  title: string;
  type: string;
  status: "pending" | "in_progress" | "completed";
  assignee?: string | null;
};

function SharedTeamTasks() {
  const [tasks, setTasks] = useState<SharedTeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadTasks() {
    try {
      setTasks(await customFetch<SharedTeamTask[]>("/api/smart-tasks"));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المهام");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  async function updateStatus(task: SharedTeamTask, status: SharedTeamTask["status"]) {
    setUpdatingId(task.id);
    try {
      await customFetch(`/api/smart-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "تعذر تحديث المهمة");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">مهام الفريق</h2>
        <p className="mt-1 text-muted-foreground">تابع المهام المسندة إليك وحدّث حالتها.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            قائمة المهام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <p className="text-muted-foreground">جارٍ تحميل المهام...</p>
          ) : tasks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">لا توجد مهام.</p>
          ) : tasks.map((task) => (
            <div key={task.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className={`flex-1 font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                {task.title}
              </span>
              {task.assignee && <span className="text-sm text-muted-foreground">{task.assignee}</span>}
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={task.status}
                disabled={updatingId === task.id}
                onChange={(event) => void updateStatus(task, event.target.value as SharedTeamTask["status"])}
                aria-label={`حالة المهمة: ${task.title}`}
              >
                <option value="pending">معلقة</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}