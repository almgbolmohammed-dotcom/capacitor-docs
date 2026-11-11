import { useState, useEffect, useCallback } from "react";
import {
  useGetAccountsSummary,
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
  getGetAccountsSummaryQueryKey,
} from "@workspace/api-client-react";
import type { GetAccountsSummaryParams, Expense } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, AlertCircle, BarChart3 } from "lucide-react";
import { DateInput } from "@/components/date-input";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const CATEGORY_LABELS: Record<string, string> = {
  salary: "رواتب", rent: "إيجار محل", utilities: "فواتير",
  parts: "قطع غيار", fuel: "وقود", insurance: "تأمين", other: "أخرى",
};

const PERIOD_OPTIONS = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "year", label: "هذه السنة" },
  { key: "custom", label: "فترة محددة" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function AccountsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<GetAccountsSummaryParams["period"]>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.key === "n") { e.preventDefault(); setAddOpen(true); }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleShortcut]);

  const [expCategory, setExpCategory] = useState("other");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState("");

  const summaryParams: GetAccountsSummaryParams = {
    period,
    ...(period === "custom" && customFrom ? { from: new Date(customFrom).toISOString() } : {}),
    ...(period === "custom" && customTo ? { to: new Date(customTo).toISOString() } : {}),
  };

  const { data: summary, isLoading: summaryLoading } = useGetAccountsSummary(summaryParams);

  const expensesParams = period === "custom"
    ? { from: customFrom ? new Date(customFrom).toISOString() : undefined, to: customTo ? new Date(customTo).toISOString() : undefined }
    : {};

  const { data: expenses, isLoading: expensesLoading } = useListExpenses(expensesParams);

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAccountsSummaryQueryKey(summaryParams) });
  }

  async function handleAddExpense() {
    if (!expDesc || !expAmount) return;
    await createExpense.mutateAsync({
      data: {
        category: expCategory as Expense["category"],
        description: expDesc,
        amount: parseInt(expAmount),
        date: expDate ? new Date(expDate).toISOString() : new Date().toISOString(),
      }
    });
    setExpDesc(""); setExpAmount(""); setExpDate(""); setExpCategory("other");
    setAddOpen(false);
    invalidate();
    toast({ title: "تم إضافة المصروف" });
  }

  async function handleDelete(id: number) {
    await deleteExpense.mutateAsync({ id });
    invalidate();
    toast({ title: "تم الحذف" });
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الحسابات والمصروفات</h2>
          <p className="text-muted-foreground mt-1">متابعة الدخل والمصاريف وصافي الربح</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />إضافة مصروف
              <kbd className="text-xs opacity-60 border rounded px-1 ml-1 hidden sm:inline">Alt+N</kbd>
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة مصروف جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">الفئة</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <Button key={k} size="sm" variant={expCategory === k ? "default" : "outline"} onClick={() => setExpCategory(k)}>{v}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الوصف</label>
                <Input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="مثال: راتب السائق" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المبلغ (ريال)</label>
                <Input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">التاريخ (اختياري)</label>
                <DateInput value={expDate} onChange={setExpDate} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAddExpense} disabled={createExpense.isPending || !expDesc || !expAmount}>
                  {createExpense.isPending ? "جاري الحفظ..." : "إضافة"}
                </Button>
                <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <Button key={opt.key} size="sm" variant={period === opt.key ? "default" : "outline"} onClick={() => setPeriod(opt.key as GetAccountsSummaryParams["period"])}>
            {opt.label}
          </Button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex gap-4 items-center flex-wrap bg-muted/30 rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">من:</label>
            <DateInput value={customFrom} onChange={setCustomFrom} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">إلى:</label>
            <DateInput value={customTo} onChange={setCustomTo} />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الدخل</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{fmt(summary.income)}</div>
              <p className="text-xs text-muted-foreground mt-1">ريال</p>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-destructive">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{fmt(summary.expenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">ريال</p>
            </CardContent>
          </Card>
          <Card className={`border-t-4 ${summary.netProfit >= 0 ? "border-t-primary" : "border-t-orange-500"}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
              <Wallet className={`h-4 w-4 ${summary.netProfit >= 0 ? "text-primary" : "text-orange-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${summary.netProfit >= 0 ? "text-primary" : "text-orange-500"}`}>
                {summary.netProfit < 0 ? "-" : ""}{fmt(Math.abs(summary.netProfit))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">ريال</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            سجل المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-12"/>)}</div>
          ) : !expenses?.length ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد مصروفات مسجلة</div>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{CATEGORY_LABELS[exp.category] || exp.category}</Badge>
                    <div>
                      <p className="font-medium text-sm">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(exp.date), "dd/MM/yyyy", { locale: ar })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-destructive">{fmt(exp.amount)} ريال</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المصروف؟</AlertDialogTitle>
                          <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(exp.id)}>حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
