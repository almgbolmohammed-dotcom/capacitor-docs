import { useState } from "react";
import {
  getGetOwnerAccountsQueryKey,
  useCreateOwnerPayment,
  useGetOwnerAccounts,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Car, Phone, Wallet, ArrowDownToLine } from "lucide-react";

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default function OwnerAccountsPage() {
  const { data, isLoading } = useGetOwnerAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const payOwner = useCreateOwnerPayment();
  const [selected, setSelected] = useState<{ carId: number; ownerName: string; due: number } | null>(null);
  const [amount, setAmount] = useState("");
  const accounts = data?.accounts ?? [];
  const totalDue = accounts.reduce((sum, account) => sum + account.dueToOwner, 0);
  const totalCommission = accounts.reduce((sum, account) => sum + account.officeCommission, 0);

  function submitPayment() {
    if (!selected) return;
    const value = parseInt(amount, 10) || 0;
    if (value <= 0 || value > selected.due) {
      toast({ title: `المبلغ يجب أن يكون بين 1 و ${fmt(selected.due)} ريال`, variant: "destructive" });
      return;
    }
    payOwner.mutate({ data: { carId: selected.carId, amount: value } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOwnerAccountsQueryKey() });
        setSelected(null); setAmount("");
        toast({ title: "تم تسجيل تسليم مستحقات المالك" });
      },
      onError: () => toast({ title: "تعذر تسجيل الدفعة", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      <div><h2 className="text-3xl font-bold tracking-tight">حسابات ملاك السيارات</h2><p className="text-muted-foreground mt-1">متابعة مستحقات الملاك الخارجيين وعمولة المكتب</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-orange-500"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">إجمالي مستحقات الملاك</p><p className="text-3xl font-bold text-orange-600 mt-2">{fmt(totalDue)} ريال</p></CardContent></Card>
        <Card className="border-t-4 border-t-primary"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">عمولة المكتب</p><p className="text-3xl font-bold text-primary mt-2">{fmt(totalCommission)} ريال</p></CardContent></Card>
        <Card className="border-t-4 border-t-green-500"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">عدد حسابات السيارات</p><p className="text-3xl font-bold text-green-600 mt-2">{accounts.length}</p></CardContent></Card>
      </div>
      {isLoading ? <Card><CardContent className="py-12 text-center text-muted-foreground">جارٍ تحميل حسابات الملاك...</CardContent></Card> : accounts.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground"><Wallet className="mx-auto h-12 w-12 mb-3 opacity-40" /><p>لا توجد سيارات بملكية خارجية</p><p className="text-xs mt-1">حدد ملكية السيارة وعمولة المكتب من قسم السيارات.</p></CardContent></Card> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card key={`${account.ownerName}-${account.carId}`} className="border-t-4 border-t-orange-400">
              <CardHeader className="pb-3 bg-muted/20"><div className="flex justify-between gap-3"><div><CardTitle className="text-lg">{account.ownerName}</CardTitle>{account.ownerPhone && <a href={`tel:${account.ownerPhone}`} className="text-sm text-primary inline-flex items-center gap-1 mt-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{account.ownerPhone}</a>}</div><Badge variant="outline">{account.carCount} سيارة</Badge></div></CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">{account.cars.map((car) => <Badge key={car.carId} variant="secondary" className="gap-1"><Car className="h-3 w-3" />{car.carModel} — {car.carPlate}</Badge>)}</div>
                <div className="grid grid-cols-2 gap-2 text-sm"><div className="bg-muted/40 p-3 rounded-lg"><p className="text-xs text-muted-foreground">المحصل</p><p className="font-bold">{fmt(account.totalCollected)} ريال</p></div><div className="bg-primary/5 p-3 rounded-lg"><p className="text-xs text-muted-foreground">عمولة المكتب ({account.commissionPercent}%)</p><p className="font-bold text-primary">{fmt(account.officeCommission)} ريال</p></div><div className="bg-orange-500/10 p-3 rounded-lg"><p className="text-xs text-muted-foreground">حصة المالك</p><p className="font-bold text-orange-700">{fmt(account.ownerShare)} ريال</p></div><div className="bg-green-500/10 p-3 rounded-lg"><p className="text-xs text-muted-foreground">المسلم / المتبقي</p><p className="font-bold text-green-700">{fmt(account.paidToOwner)} / {fmt(account.dueToOwner)}</p></div></div>
                {account.customerDebt > 0 && <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">ديون زبائن مرتبطة بسيارات هذا المالك: {fmt(account.customerDebt)} ريال</p>}
                <Button className="w-full gap-2" variant="outline" disabled={account.dueToOwner <= 0} onClick={() => { const car = account.cars.find((item) => item.dueToOwner > 0) ?? account; setSelected({ carId: car.carId, ownerName: account.ownerName, due: car.dueToOwner }); }}><ArrowDownToLine className="h-4 w-4" />تسجيل تسليم للمالك</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent dir="rtl"><DialogHeader><DialogTitle>تسجيل تسليم مستحقات — {selected?.ownerName}</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-muted-foreground">المتبقي للسيارة المحددة: <strong>{fmt(selected?.due ?? 0)} ريال</strong></p><Input type="number" min="1" max={selected?.due} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="المبلغ المسلم" /><Button className="w-full gap-2" onClick={submitPayment} disabled={payOwner.isPending}><Banknote className="h-4 w-4" />تسجيل الدفعة</Button></div></DialogContent></Dialog>
    </div>
  );
}