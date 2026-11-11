import { useMemo } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  getGetOwnerAccountsQueryKey,
  getListExpensesQueryKey,
  getListFixedExpensesQueryKey,
  getListIncomeQueryKey,
  useGetOwnerAccounts,
  useListDebts,
  useListExpenses,
  useListFixedExpenses,
  useListIncome,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(Math.round(value));
const CATEGORY_LABELS: Record<string, string> = {
  salary: "رواتب",
  rent: "إيجار",
  utilities: "فواتير",
  insurance: "تأمين",
  other: "أخرى",
};

function isInCurrentMonth(value: string | Date, start: Date, end: Date) {
  const date = new Date(value);
  return date >= start && date <= end;
}

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const { data: income = [], isLoading: incomeLoading } = useListIncome();
  const { data: expenses = [], isLoading: expensesLoading } = useListExpenses();
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useListFixedExpenses();
  const { data: debts = [] } = useListDebts();
  const { data: ownerAccounts } = useGetOwnerAccounts();

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthDays = monthEnd.getDate();
    const elapsedDays = Math.max(1, now.getDate());
    const remainingDays = Math.max(0, monthDays - elapsedDays);
    const monthIncome = income.filter((row) => isInCurrentMonth(row.completedAt, monthStart, monthEnd));
    const monthExpenses = expenses.filter((row) => isInCurrentMonth(row.date, monthStart, monthEnd));
    const incomeToDate = monthIncome.reduce((sum, row) => sum + row.totalAmount, 0);
    const expensesToDate = monthExpenses.reduce((sum, row) => sum + row.amount, 0);
    const fixedMonthly = fixedExpenses
      .filter((row) => row.isActive)
      .reduce((sum, row) => sum + row.monthlyAmount, 0);
    const averageDailyIncome = incomeToDate / elapsedDays;
    const projectedIncome = averageDailyIncome * monthDays;
    const projectedCosts = expensesToDate + fixedMonthly;
    const projectedProfit = projectedIncome - projectedCosts;
    const currentNet = incomeToDate - expensesToDate - fixedMonthly;
    const requiredDaily = remainingDays > 0
      ? Math.max(0, (projectedCosts - incomeToDate) / remainingDays)
      : Math.max(0, projectedCosts - incomeToDate);
    const outstandingCustomerDebt = debts
      .filter((debt) => !debt.isSettled)
      .reduce((sum, debt) => sum + debt.totalAmount, 0);
    const ownerDue = (ownerAccounts?.accounts ?? []).reduce((sum, account) => sum + account.dueToOwner, 0);

    return {
      monthLabel: now.toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
      monthDays,
      elapsedDays,
      remainingDays,
      incomeToDate,
      expensesToDate,
      fixedMonthly,
      averageDailyIncome,
      projectedIncome,
      projectedCosts,
      projectedProfit,
      currentNet,
      requiredDaily,
      outstandingCustomerDebt,
      ownerDue,
    };
  }, [debts, expenses, fixedExpenses, income, ownerAccounts]);

  const isLoading = incomeLoading || expensesLoading || fixedLoading;
  const isDeficit = metrics.projectedProfit < 0;
  const fixedCovered = metrics.incomeToDate >= metrics.fixedMonthly;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFixedExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetOwnerAccountsQueryKey() });
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">المساعد الذكي</h2>
          </div>
          <p className="text-muted-foreground mt-1">قراءة مبسطة لوضع المكتب وتوقع النتيجة قبل نهاية الشهر</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />تحديث التحليل
        </Button>
      </div>

      <Card className={`border-t-4 ${isDeficit ? "border-t-orange-500" : "border-t-green-500"}`}>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            {isDeficit ? <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 shrink-0" /> : <CheckCircle2 className="h-6 w-6 text-green-600 mt-1 shrink-0" />}
            <div>
              <p className="font-bold text-lg">{isDeficit ? "تنبيه: يوجد عجز متوقع" : "الوضع المالي مطمئن"}</p>
              <p className="text-muted-foreground mt-1">
                {isDeficit
                  ? `التوقع الحالي يشير إلى عجز قدره ${fmt(Math.abs(metrics.projectedProfit))} ريال بنهاية ${metrics.monthLabel}. تحتاج إلى متوسط ${fmt(metrics.requiredDaily)} ريال يومياً خلال الأيام المتبقية لتغطية الالتزامات.`
                  : `التوقع الحالي يشير إلى فائض قدره ${fmt(metrics.projectedProfit)} ريال بنهاية ${metrics.monthLabel}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="دخل المكتب حتى الآن" value={metrics.incomeToDate} caption={metrics.monthLabel} icon={<TrendingUp className="h-5 w-5 text-green-600" />} tone="green" loading={isLoading} />
        <MetricCard title="التكاليف المتوقعة" value={metrics.projectedCosts} caption="المصروف الفعلي + الثابت الشهري" icon={<TrendingDown className="h-5 w-5 text-orange-600" />} tone="orange" loading={isLoading} />
        <MetricCard title="التوقع الشهري للدخل" value={metrics.projectedIncome} caption={`متوسط يومي ${fmt(metrics.averageDailyIncome)} ريال`} icon={<Target className="h-5 w-5 text-primary" />} tone="primary" loading={isLoading} />
        <MetricCard title="صافي النتيجة المتوقعة" value={metrics.projectedProfit} caption={isDeficit ? "يحتاج إلى تحسين الدخل" : "بعد الالتزامات الثابتة"} icon={<WalletCards className="h-5 w-5 text-primary" />} tone={isDeficit ? "orange" : "primary"} loading={isLoading} signed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />توزيع الشهر</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="أيام الشهر" value={`${metrics.monthDays} يوم`} />
            <InfoRow label="الأيام المنقضية" value={`${metrics.elapsedDays} يوم`} />
            <InfoRow label="الأيام المتبقية" value={`${metrics.remainingDays} يوم`} />
            <InfoRow label="الحد الأدنى المطلوب يومياً" value={`${fmt(metrics.requiredDaily)} ريال`} emphasis />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary" />نقطة التعادل</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="المصروفات الفعلية" value={`${fmt(metrics.expensesToDate)} ريال`} />
            <InfoRow label="الالتزامات الثابتة" value={`${fmt(metrics.fixedMonthly)} ريال`} />
            <InfoRow label="المطلوب لتغطية الشهر" value={`${fmt(metrics.projectedCosts)} ريال`} emphasis />
            <p className={`rounded-lg p-2 text-xs ${fixedCovered ? "bg-green-500/10 text-green-700" : "bg-orange-500/10 text-orange-700"}`}>
              {fixedCovered ? "تمت تغطية الالتزامات الثابتة حتى الآن." : `المتبقي لتغطية الالتزامات الثابتة: ${fmt(Math.max(0, metrics.fixedMonthly - metrics.incomeToDate))} ريال.`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><WalletCards className="h-4 w-4 text-primary" />التزامات تحتاج متابعة</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="ديون العملاء" value={`${fmt(metrics.outstandingCustomerDebt)} ريال`} />
            <InfoRow label="المستحق للملاك" value={`${fmt(metrics.ownerDue)} ريال`} />
            <InfoRow label="صافي النتيجة الحالية" value={`${fmt(metrics.currentNet)} ريال`} emphasis />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">المصروفات الثابتة التي يعتمد عليها التحليل</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">يتم توزيع إجماليها على أيام الشهر كالتزام يومي.</p>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />إدارة المصروفات</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {fixedExpenses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              <p>لم تتم إضافة مصروفات ثابتة بعد.</p>
              <Link href="/settings"><Button variant="link">أضفها من الإعدادات</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {fixedExpenses.filter((expense) => expense.isActive).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 border p-3">
                  <div className="min-w-0"><p className="font-medium truncate">{expense.description}</p><p className="text-xs text-muted-foreground">{CATEGORY_LABELS[expense.category] ?? expense.category}</p></div>
                  <span className="font-bold text-destructive shrink-0">{fmt(expense.monthlyAmount)} ريال</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  caption,
  icon,
  tone,
  loading,
  signed,
}: {
  title: string;
  value: number;
  caption: string;
  icon: React.ReactNode;
  tone: "green" | "orange" | "primary";
  loading: boolean;
  signed?: boolean;
}) {
  const color = tone === "green" ? "text-green-600" : tone === "orange" ? "text-orange-600" : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>{icon}</CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{loading ? "..." : `${signed && value > 0 ? "+" : ""}${fmt(value)} ريال`}</div>
        <p className="text-xs text-muted-foreground mt-1">{caption}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${emphasis ? "font-bold text-primary border-t pt-3" : ""}`}><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}