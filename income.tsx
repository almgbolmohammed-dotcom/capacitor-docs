import { useState } from "react";
import { useListIncome, useDeleteIncome, getListIncomeQueryKey, useListCars } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Wallet, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function Income() {
  const { data: incomeRecords, isLoading, error } = useListIncome();
  const { data: cars } = useListCars();
  const deleteIncome = useDeleteIncome();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteIncome.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
        toast({ title: "تم حذف السجل بنجاح" });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "فشل الحذف", variant: "destructive" });
        setDeleteId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !incomeRecords) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-destructive rounded-xl bg-destructive/5">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p>فشل في تحميل سجلات الدخل.</p>
      </div>
    );
  }

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.totalAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">سجل الدخل</h2>
          <p className="text-muted-foreground mt-1">تاريخ المبالغ المحصلة من التأجير</p>
        </div>
        <div className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-4 py-2 rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-800">
          <Wallet className="h-5 w-5" />
          <span className="font-bold text-lg">{totalIncome.toLocaleString('en-US')} ريال</span>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">السيارة</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">النطاق</TableHead>
              <TableHead className="text-right">المدة</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  لا توجد سجلات دخل حتى الآن.
                </TableCell>
              </TableRow>
            ) : (
              incomeRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/30">
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
                  <TableCell>{record.zone === "inside" ? "داخل صنعاء" : "خارج صنعاء"}</TableCell>
                  <TableCell>{record.daysCount} أيام</TableCell>
                  <TableCell className="font-bold text-green-600 dark:text-green-400">
                    {record.totalAmount.toLocaleString('en-US')} ريال
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
            <AlertDialogTitle>حذف سجل الدخل</AlertDialogTitle>
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
    </div>
  );
}
