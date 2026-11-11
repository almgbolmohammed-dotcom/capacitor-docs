import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDebts,
  useSettleDebt,
  useDeleteDebt,
  getListDebtsQueryKey,
  getListIncomeQueryKey,
  useListCars,
} from "@workspace/api-client-react";
import { useWebCarPhotos } from "@/hooks/use-car-photos";
import { Car as CarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Receipt, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

function CarPhotoCell({ carPlate, cars }: { carPlate: string; cars?: { id: number; plateNumber: string }[] }) {
  const car = (cars ?? []).find(c => c.plateNumber === carPlate);
  const photos = useWebCarPhotos(car?.id ?? 0);
  if (!photos.length) return null;
  return (
    <img
      src={photos[0]}
      alt=""
      className="w-9 h-9 rounded-md object-cover inline-block align-middle ml-2 border"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function Debts() {
  const { data: debtRecords, isLoading, error } = useListDebts();
  const { data: cars } = useListCars();
  const queryClient = useQueryClient();
  const settleDebt = useSettleDebt();
  const deleteDebt = useDeleteDebt();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [settleId, setSettleId] = useState<number | null>(null);
  const [settleMode, setSettleMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState<string>("");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !debtRecords) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-destructive rounded-xl bg-destructive/5">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p>فشل في تحميل سجلات المديونية.</p>
      </div>
    );
  }

  const outstandingDebts = debtRecords.filter(r => !r.isSettled);
  const totalOutstanding = outstandingDebts.reduce((sum, record) => sum + record.totalAmount, 0);
  const settleRecord = settleId !== null ? debtRecords.find(r => r.id === settleId) ?? null : null;

  const openSettleDialog = (id: number) => {
    setSettleId(id);
    setSettleMode("full");
    setPartialAmount("");
  };

  const closeSettleDialog = () => {
    setSettleId(null);
    setSettleMode("full");
    setPartialAmount("");
  };

  const handleConfirmSettle = () => {
    if (settleId === null) return;
    const amount = settleMode === "partial" ? parseInt(partialAmount, 10) : undefined;

    if (settleMode === "partial") {
      if (!amount || amount <= 0) {
        toast({ title: "الرجاء إدخال مبلغ صحيح", variant: "destructive" });
        return;
      }
      if (settleRecord && amount >= settleRecord.totalAmount) {
        toast({ title: "المبلغ الجزئي يجب أن يكون أقل من المبلغ الكلي", variant: "destructive" });
        return;
      }
    }

    settleDebt.mutate({ id: settleId, data: amount !== undefined ? { partialAmount: amount } : undefined }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDebtsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
        toast({ title: settleMode === "partial" ? "تم تسجيل الدفعة الجزئية بنجاح" : "تم سداد الدين بنجاح" });
        closeSettleDialog();
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء السداد", variant: "destructive" });
      },
    });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteDebt.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDebtsQueryKey() });
        toast({ title: "تم حذف السجل بنجاح" });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "فشل الحذف", variant: "destructive" });
        setDeleteId(null);
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">المديونية</h2>
          <p className="text-muted-foreground mt-1">تتبع وتسوية الديون المعلقة</p>
        </div>
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg flex items-center gap-2 border border-destructive/20">
          <Receipt className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-xs">المتبقي</span>
            <span className="font-bold">{totalOutstanding.toLocaleString('en-US')} ريال</span>
          </div>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">السيارة</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
              <TableHead className="text-right w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  لا توجد ديون مسجلة.
                </TableCell>
              </TableRow>
            ) : (
              debtRecords.map((record) => (
                <TableRow key={record.id} className={`hover:bg-muted/30 ${record.isSettled ? 'opacity-60' : ''}`}>
                  <TableCell className="font-medium">
                    {format(new Date(record.completedAt), 'PPP', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CarPhotoCell carPlate={record.carPlate} cars={cars} />
                      <div>
                        <p>{record.carModel}</p>
                        <span className="text-xs text-muted-foreground bg-muted px-1 rounded block mt-1 w-fit">{record.carPlate}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{record.customerName || "—"}</TableCell>
                  <TableCell className={`font-bold ${record.isSettled ? '' : 'text-destructive'}`}>
                    {record.totalAmount.toLocaleString('en-US')} ريال
                  </TableCell>
                  <TableCell>
                    {record.isSettled ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">مسدد</Badge>
                    ) : (
                      <Badge variant="destructive">غير مسدد</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!record.isSettled && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
                        onClick={() => openSettleDialog(record.id)}
                        disabled={settleDebt.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        سداد
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => setDeleteId(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سجل المديونية</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={settleId !== null} onOpenChange={(open) => !open && closeSettleDialog()}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>سداد الدين</DialogTitle>
            <DialogDescription>
              {settleRecord
                ? `المبلغ المستحق: ${settleRecord.totalAmount.toLocaleString('en-US')} ريال`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={settleMode}
            onValueChange={(value) => setSettleMode(value as "full" | "partial")}
            className="gap-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="full" id="settle-full" />
              <Label htmlFor="settle-full">مسدد بالكامل</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="partial" id="settle-partial" />
              <Label htmlFor="settle-partial">جزء</Label>
            </div>
          </RadioGroup>

          {settleMode === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="partial-amount">المبلغ المدفوع الآن</Label>
              <Input
                id="partial-amount"
                type="number"
                min={1}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="أدخل المبلغ"
              />
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleConfirmSettle} disabled={settleDebt.isPending}>
              تأكيد
            </Button>
            <Button variant="outline" onClick={closeSettleDialog}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
