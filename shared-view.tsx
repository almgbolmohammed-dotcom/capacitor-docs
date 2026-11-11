import { useEffect, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Section = string;
type SharedTask = { id: number; title: string; status: string; assignee?: string | null; type?: string };
type SharedData = {
  label: string;
  officeName: string;
  whatsappPhone: string;
  sections: Section[];
  data: {
    dashboard?: { totalCars: number; availableCars: number; activeRentals: number; completedRentals: number; totalIncome: number };
    cars?: Array<{ id: number; model: string; plateNumber: string; isAvailable: boolean }>;
    maintenance?: Array<{ id: number; model: string; plateNumber: string; maintenanceStatus: string }>;
    rentals?: Array<{ id: number; carModel?: string; carPlate?: string; customerName?: string | null; customerPhone?: string | null; dailyRate: number; startedAt: string }>;
    completed?: Array<{ id: number; carModel?: string; carPlate?: string; customerName?: string | null; totalAmount: number; completedAt?: string | null }>;
    alerts?: Array<{ id: number; carModel?: string; carPlate?: string; customerName?: string | null; customerPhone?: string | null; startedAt: string; plannedDays?: number | null }>;
    income?: Array<{ id: number; carModel: string; carPlate: string; customerName?: string | null; totalAmount: number; completedAt: string }>;
    debts?: Array<{ id: number; carModel: string; carPlate: string; customerName?: string | null; totalAmount: number; isSettled: boolean }>;
    accounts?: { totalIncome: number; totalExpenses: number; totalDebt: number; net: number };
    contracts?: Array<{ id: string; customerName: string; carModel: string; carPlate: string; date: string }>;
    customers?: Array<{ name?: string | null; phone?: string | null; address?: string | null }>;
    ownerAccounts?: { payments: Array<{ id: number; ownerName: string; amount: number; paidAt: string }> };
    reports?: { totalIncome: number; totalExpenses: number; totalDebt: number; completedRentals: number };
    assistant?: { totalIncome: number; totalExpenses: number; totalDebt: number; projectedNet: number };
    tasks?: SharedTask[];
  };
};

const labels: Record<string, string> = {
  dashboard: "الرئيسية والملخص",
  cars: "السيارات",
  rentals: "التأجيرات النشطة",
  completed: "الأنشطة المنتهية",
  alerts: "التنبيهات والمتابعة",
  contracts: "العقود",
  customers: "معلومات الزبائن",
  ownerAccounts: "حسابات ملاك السيارات",
  accounts: "الحسابات والمصروفات",
  income: "الدخل",
  debts: "المديونية",
  reports: "التقارير",
  assistant: "المساعد الذكي",
  tasks: "مهام الفريق",
  maintenance: "الصيانة",
};

const money = (value: number) => `${(value ?? 0).toLocaleString("en-US")} ريال`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("ar-SA") : "—";

export default function SharedView({ params }: { params: { token: string } }) {
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    customFetch<SharedData>(`/api/public/share/${params.token}`)
      .then((result) => {
        setData(result);
        setActiveSection(result.sections[0] ?? "");
      })
      .catch(() => setError("الرابط غير صالح أو تم إيقافه"));
  }, [params.token]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-destructive" dir="rtl">{error}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground" dir="rtl">جارٍ تحميل الرابط...</div>;

  const availableSections = data.sections.filter((section) => labels[section]);
  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="rounded-2xl bg-card border p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{data.officeName}</p>
            <h1 className="text-2xl font-bold mt-1">{data.label}</h1>
            <p className="text-xs text-muted-foreground mt-2">هذا الرابط يتيح الأقسام المحددة فقط</p>
          </div>
          {data.whatsappPhone && (
            <a
              href={`https://wa.me/${data.whatsappPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              تواصل عبر واتساب المكتب
            </a>
          )}
        </header>

        <div className="grid lg:grid-cols-[230px_1fr] gap-5 items-start">
          <nav className="rounded-2xl bg-card border p-3 space-y-1 lg:sticky lg:top-4">
            <p className="text-xs text-muted-foreground px-3 pb-2">الأقسام المسموحة</p>
            {availableSections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full text-right rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeSection === section ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
              >
                {labels[section]}
              </button>
            ))}
          </nav>

          <main className="min-w-0">
            {activeSection === "dashboard" && <DashboardSection data={data.data.dashboard} />}
            {activeSection === "cars" && <CarsSection cars={data.data.cars ?? []} />}
            {activeSection === "maintenance" && <MaintenanceSection cars={data.data.maintenance ?? []} />}
            {activeSection === "rentals" && <RentalSection rentals={data.data.rentals ?? []} />}
            {activeSection === "completed" && <CompletedSection rentals={data.data.completed ?? []} />}
            {activeSection === "alerts" && <RentalSection rentals={data.data.alerts ?? []} title="التنبيهات التي تحتاج متابعة" />}
            {activeSection === "income" && <IncomeSection rows={data.data.income ?? []} />}
            {activeSection === "debts" && <DebtSection rows={data.data.debts ?? []} />}
            {activeSection === "accounts" && <AccountsSection data={data.data.accounts} />}
            {activeSection === "contracts" && <ContractsSection rows={data.data.contracts ?? []} />}
            {activeSection === "customers" && <CustomersSection rows={data.data.customers ?? []} />}
            {activeSection === "ownerAccounts" && <OwnerAccountsSection data={data.data.ownerAccounts} />}
            {activeSection === "reports" && <ReportsSection data={data.data.reports} />}
            {activeSection === "assistant" && <AssistantSection data={data.data.assistant} />}
            {activeSection === "tasks" && <TasksSection token={params.token} tasks={data.data.tasks ?? []} onUpdate={(tasks) => setData({ ...data, data: { ...data.data, tasks } })} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

function DashboardSection({ data }: { data?: SharedData["data"]["dashboard"] }) {
  if (!data) return null;
  return <SectionCard title="ملخص المكتب"><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[
    ["إجمالي السيارات", data.totalCars], ["السيارات المتاحة", data.availableCars], ["تأجيرات نشطة", data.activeRentals], ["تأجيرات مكتملة", data.completedRentals], ["إجمالي الدخل", money(data.totalIncome)],
  ].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}</div></SectionCard>;
}

function CarsSection({ cars }: { cars: NonNullable<SharedData["data"]["cars"]> }) {
  return <SectionCard title="السيارات"><div className="grid sm:grid-cols-2 gap-3">{cars.map((car) => <div key={car.id} className="rounded-lg border p-3 flex justify-between gap-3"><span>{car.model} — {car.plateNumber}</span><Badge variant={car.isAvailable ? "secondary" : "outline"}>{car.isAvailable ? "متاحة" : "غير متاحة"}</Badge></div>)}</div></SectionCard>;
}

function MaintenanceSection({ cars }: { cars: NonNullable<SharedData["data"]["maintenance"]> }) {
  return <SectionCard title="السيارات والصيانة"><div className="space-y-2">{cars.map((car) => <div key={car.id} className="rounded-lg border p-3 flex justify-between"><span>{car.model} — {car.plateNumber}</span><Badge>{car.maintenanceStatus}</Badge></div>)}</div></SectionCard>;
}

function RentalSection({ rentals, title = "التأجيرات النشطة" }: { rentals: Array<{ id: number; carModel?: string; carPlate?: string; customerName?: string | null; customerPhone?: string | null; dailyRate?: number; startedAt: string }>; title?: string }) {
  return <SectionCard title={title}><div className="space-y-2">{rentals.length ? rentals.map((rental) => <div key={rental.id} className="rounded-lg border p-3 flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{rental.carModel || "سيارة"} — {rental.carPlate}</p><p className="text-sm text-muted-foreground">{rental.customerName || "غير محدد"} · بدأ {date(rental.startedAt)}</p></div>{rental.dailyRate ? <span className="font-semibold">{money(rental.dailyRate)} / يوم</span> : null}</div>) : <p className="text-muted-foreground">لا توجد بيانات.</p>}</div></SectionCard>;
}

function CompletedSection({ rentals }: { rentals: NonNullable<SharedData["data"]["completed"]> }) {
  return <SectionCard title="الأنشطة المنتهية"><div className="space-y-2">{rentals.length ? rentals.map((rental) => <div key={rental.id} className="rounded-lg border p-3 flex justify-between"><div><p className="font-semibold">{rental.carModel} — {rental.carPlate}</p><p className="text-sm text-muted-foreground">{rental.customerName || "غير محدد"} · {date(rental.completedAt)}</p></div><span className="font-semibold">{money(rental.totalAmount)}</span></div>) : <p className="text-muted-foreground">لا توجد تأجيرات مكتملة.</p>}</div></SectionCard>;
}

function IncomeSection({ rows }: { rows: NonNullable<SharedData["data"]["income"]> }) {
  return <SectionCard title="سجلات الدخل"><div className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-lg border p-3 flex justify-between"><span>{row.carModel} — {row.carPlate}</span><span className="font-semibold">{money(row.totalAmount)}</span></div>)}</div></SectionCard>;
}

function DebtSection({ rows }: { rows: NonNullable<SharedData["data"]["debts"]> }) {
  return <SectionCard title="المديونية"><div className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-lg border p-3 flex justify-between"><div><p>{row.customerName || "غير محدد"} — {row.carPlate}</p><p className="text-xs text-muted-foreground">{row.isSettled ? "مسددة" : "غير مسددة"}</p></div><span className="font-semibold">{money(row.totalAmount)}</span></div>)}</div></SectionCard>;
}

function AccountsSection({ data }: { data?: SharedData["data"]["accounts"] }) {
  if (!data) return null;
  return <SectionCard title="الحسابات والمصروفات"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["إجمالي الدخل", data.totalIncome], ["المصروفات", data.totalExpenses], ["المديونية", data.totalDebt], ["الصافي", data.net]].map(([label, value]) => <div key={String(label)} className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold mt-2">{money(Number(value))}</p></div>)}</div></SectionCard>;
}

function ContractsSection({ rows }: { rows: NonNullable<SharedData["data"]["contracts"]> }) {
  return <SectionCard title="العقود"><div className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-lg border p-3"><p className="font-semibold">{row.customerName} — {row.carModel}</p><p className="text-sm text-muted-foreground">{row.carPlate} · {date(row.date)}</p></div>)}</div></SectionCard>;
}

function CustomersSection({ rows }: { rows: NonNullable<SharedData["data"]["customers"]> }) {
  return <SectionCard title="معلومات الزبائن"><div className="grid sm:grid-cols-2 gap-3">{rows.map((row, index) => <div key={`${row.phone}-${index}`} className="rounded-lg border p-3"><p className="font-semibold">{row.name || "غير محدد"}</p><p className="text-sm text-muted-foreground">{row.phone || "لا يوجد هاتف"} · {row.address || "لا يوجد عنوان"}</p></div>)}</div></SectionCard>;
}

function OwnerAccountsSection({ data }: { data?: SharedData["data"]["ownerAccounts"] }) {
  return <SectionCard title="حسابات ملاك السيارات"><div className="space-y-2">{data?.payments?.map((row) => <div key={row.id} className="rounded-lg border p-3 flex justify-between"><span>{row.ownerName}</span><span>{money(row.amount)}</span></div>) ?? <p className="text-muted-foreground">لا توجد دفعات.</p>}</div></SectionCard>;
}

function ReportsSection({ data }: { data?: SharedData["data"]["reports"] }) {
  if (!data) return null;
  return <SectionCard title="التقارير"><div className="space-y-2 text-sm"><p>التأجيرات المكتملة: <strong>{data.completedRentals}</strong></p><p>إجمالي الدخل: <strong>{money(data.totalIncome)}</strong></p><p>إجمالي المصروفات: <strong>{money(data.totalExpenses)}</strong></p><p>المديونية: <strong>{money(data.totalDebt)}</strong></p></div></SectionCard>;
}

function AssistantSection({ data }: { data?: SharedData["data"]["assistant"] }) {
  if (!data) return null;
  return <SectionCard title="المساعد الذكي"><div className="grid sm:grid-cols-2 gap-3"><Info label="إجمالي الدخل" value={money(data.totalIncome)} /><Info label="إجمالي المصروفات" value={money(data.totalExpenses)} /><Info label="المديونية" value={money(data.totalDebt)} /><Info label="الصافي المتوقع" value={money(data.projectedNet)} /></div></SectionCard>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold mt-1">{value}</p></div>;
}

function TasksSection({ token, tasks, onUpdate }: { token: string; tasks: SharedTask[]; onUpdate: (tasks: SharedTask[]) => void }) {
  async function update(task: SharedTask, status: string) {
    await customFetch(`/api/public/share/${token}/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    onUpdate(tasks.map((item) => item.id === task.id ? { ...item, status } : item));
  }
  return <SectionCard title="مهام الفريق"><div className="space-y-2">{tasks.length ? tasks.map((task) => <div key={task.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3"><span className={`flex-1 font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>{task.assignee && <span className="text-sm text-muted-foreground">{task.assignee}</span>}<select className="h-9 rounded-md border bg-background px-2 text-sm" value={task.status} onChange={(event) => update(task, event.target.value)}><option value="pending">معلقة</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتملة</option></select></div>) : <p className="text-muted-foreground">لا توجد مهام.</p>}</div></SectionCard>;
}
