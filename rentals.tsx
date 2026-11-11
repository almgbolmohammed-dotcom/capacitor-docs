import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRentals,
  useListCars,
  useCreateRental,
  useCompleteRental,
  useCreateRentalPayment,
  useUpdateRentalRate,
  getListRentalsQueryKey,
  getListCarsQueryKey,
  getListIncomeQueryKey,
  getListDebtsQueryKey,
  getListCustomersQueryKey,
  getGetOwnerAccountsQueryKey,
  useListReservations,
} from "@workspace/api-client-react";
import type { Rental, Car, Reservation } from "@workspace/api-client-react";
import { useWebCarPhotos } from "@/hooks/use-car-photos";
import { CreateRentalBodyZone, UpdateRentalRateBodyZone } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timer, Clock, MapPin, User, Banknote, CheckCircle, AlertCircle, Pencil, Phone, CalendarDays } from "lucide-react";
import { useRentalNotifications } from "@/hooks/use-rental-notifications";
import { useShareAccess } from "@/contexts/share-access-context";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS_WEB = 24 * HOUR_MS;

// Live Timer Component
function LiveTimer({
  startedAt,
  plannedDays,
}: {
  startedAt: string;
  plannedDays?: number | null;
}) {
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, days: 0, totalMs: 0 });

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - start;

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      setElapsed({ days, hours, minutes, totalMs: diffMs });
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (plannedDays && plannedDays > 0) {
    const dueMs = plannedDays * DAY_MS_WEB;
    const remainingMs = dueMs - elapsed.totalMs;

    if (remainingMs > 0) {
      const remDays = Math.floor(remainingMs / DAY_MS_WEB);
      const remHours = Math.floor((remainingMs % DAY_MS_WEB) / (1000 * 60 * 60));
      const remMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 font-mono bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold">
            <Clock className="h-4 w-4" />
            {remDays > 0 && <span>{remDays} يوم و </span>}
            <span>{String(remHours).padStart(2, '0')}:{String(remMinutes).padStart(2, '0')}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            متبقي من {plannedDays} {plannedDays === 1 ? "يوم" : "أيام"}
          </span>
        </div>
      );
    }

    const overdueMs = Math.abs(remainingMs);
    const overDays = Math.floor(overdueMs / DAY_MS_WEB);
    const overHours = Math.floor((overdueMs % DAY_MS_WEB) / (1000 * 60 * 60));
    const overMinutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 font-mono bg-destructive/15 text-destructive px-3 py-1.5 rounded-full text-sm font-bold">
          <AlertCircle className="h-4 w-4" />
          {overDays > 0 && <span>{overDays} يوم و </span>}
          <span>{String(overHours).padStart(2, '0')}:{String(overMinutes).padStart(2, '0')}</span>
        </div>
        <span className="text-xs text-destructive font-medium">تجاوز المدة المحددة</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold">
      <Clock className="h-4 w-4" />
      {elapsed.days > 0 && <span>{elapsed.days} يوم و </span>}
      <span>{String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}</span>
    </div>
  );
}

type DueStatus = "overdue" | "due-soon" | "ok" | "open";

interface DueInfo {
  status: DueStatus;
  remainingDays: number;
  remainingHours: number;
  overdueDays: number;
  overdueHours: number;
}

function getRentalDueInfo(startedAt: string, plannedDays?: number | null): DueInfo {
  const empty: DueInfo = { status: "open", remainingDays: 0, remainingHours: 0, overdueDays: 0, overdueHours: 0 };
  if (!plannedDays || plannedDays <= 0) return empty;
  const dueMs = plannedDays * DAY_MS_WEB;
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const remaining = dueMs - elapsed;
  if (remaining <= 0) {
    const overdueMs = Math.abs(remaining);
    return {
      status: "overdue",
      remainingDays: 0, remainingHours: 0,
      overdueDays: Math.floor(overdueMs / DAY_MS_WEB),
      overdueHours: Math.floor((overdueMs % DAY_MS_WEB) / (1000 * 60 * 60)),
    };
  }
  if (remaining <= DAY_MS_WEB) {
    return {
      status: "due-soon",
      remainingDays: 0,
      remainingHours: Math.ceil(remaining / (1000 * 60 * 60)),
      overdueDays: 0, overdueHours: 0,
    };
  }
  return {
    status: "ok",
    remainingDays: Math.floor(remaining / DAY_MS_WEB),
    remainingHours: Math.floor((remaining % DAY_MS_WEB) / (1000 * 60 * 60)),
    overdueDays: 0, overdueHours: 0,
  };
}

// Keep backward-compat helper
function getRentalDueStatus(startedAt: string, plannedDays?: number | null): DueStatus {
  return getRentalDueInfo(startedAt, plannedDays).status;
}

function CarPhotoThumb({ carId }: { carId: number }) {
  const photos = useWebCarPhotos(carId);
  if (!photos.length) return null;
  return (
    <img
      src={photos[0]}
      alt=""
      className="w-full h-28 object-cover rounded-t-lg"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}
function calcExpectedWeb(startedAt: string, dailyRate: number, plannedDays?: number | null) {
  const elapsed = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const hasPlannedDays = typeof plannedDays === "number" && plannedDays > 0;
  const days = hasPlannedDays ? plannedDays : Math.max(1, Math.ceil(elapsed / DAY_MS_WEB));
  const baseAmount = days * dailyRate;
  const lateHours = hasPlannedDays && elapsed > days * DAY_MS_WEB
    ? Math.ceil((elapsed - days * DAY_MS_WEB) / HOUR_MS)
    : 0;
  const lateCharge = lateHours * Math.ceil(dailyRate / 24);
  return { days, baseAmount, lateHours, lateCharge, amount: baseAmount + lateCharge };
}

function CollectPaymentModal({
  rental,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPayment = useCreateRentalPayment();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const expected = rental ? calcExpectedWeb(rental.startedAt, rental.dailyRate, rental.plannedDays).amount : 0;
  const remaining = Math.max(0, expected - (rental?.paidAmount ?? 0));

  const submit = () => {
    if (!rental) return;
    const value = parseInt(amount.replace(/,/g, ""), 10) || 0;
    if (value <= 0 || value > remaining) {
      toast({ title: `أدخل مبلغاً بين 1 و ${remaining.toLocaleString("en-US")} ريال`, variant: "destructive" });
      return;
    }
    createPayment.mutate(
      { id: rental.id, data: { amount: value, note: note || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
             queryClient.invalidateQueries({ queryKey: getGetOwnerAccountsQueryKey() });
          setAmount("");
          setNote("");
          onOpenChange(false);
          toast({ title: `تم تحصيل ${value.toLocaleString("en-US")} ريال` });
        },
        onError: () => toast({ title: "تعذر تسجيل الدفعة", variant: "destructive" }),
      }
    );
  };

  if (!rental) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تحصيل دفعة أثناء الإيجار</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">العميل:</span> {rental.customerName || "غير محدد"}</p>
            <p><span className="text-muted-foreground">المستحق حتى الآن:</span> {expected.toLocaleString("en-US")} ريال</p>
            <p className="font-semibold text-primary"><span className="text-muted-foreground font-normal">المتبقي:</span> {remaining.toLocaleString("en-US")} ريال</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">المبلغ المحصل (ريال)</label>
            <Input type="number" min="1" max={remaining} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ملاحظة (اختياري)</label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="دفعة مقدمة أو سداد جزئي" />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={createPayment.isPending || remaining === 0}>
              {createPayment.isPending ? "جاري الحفظ..." : "تسجيل الدفعة"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Complete Rental Modal
type OwnerSettlement = "transferred" | "debt";

function OwnerSettlementChooser({
  car,
  value,
  onChange,
  collectedAmount,
}: {
  car: Car | null;
  value: OwnerSettlement | null;
  onChange: (value: OwnerSettlement) => void;
  collectedAmount?: number;
}) {
  if (car?.ownershipType !== "external") return null;
  const commission = Math.floor((collectedAmount ?? 0) * car.ownerCommissionPercent / 100);
  const ownerShare = Math.max(0, (collectedAmount ?? 0) - commission);

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
      <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">تسوية حصة مالك السيارة</p>
      <p className="text-xs text-muted-foreground">
        اختر هل تم تسليم حصة المالك أم تبقى ديناً على المكتب.
        {collectedAmount !== undefined && (
          <> حصة المالك من المبلغ المحصل: <strong>{ownerShare.toLocaleString("en-US")} ريال</strong>.</>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === "transferred"}
          onClick={() => onChange("transferred")}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === "transferred"
              ? "border-green-600 bg-green-600 text-white"
              : "border-border bg-background hover:border-green-500/60"
          }`}
        >
          تم تحويل المبلغ للمالك
        </button>
        <button
          type="button"
          aria-pressed={value === "debt"}
          onClick={() => onChange("debt")}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === "debt"
              ? "border-orange-600 bg-orange-600 text-white"
              : "border-border bg-background hover:border-orange-500/60"
          }`}
        >
          تسجيله ديناً للمالك
        </button>
      </div>
    </div>
  );
}

function CompleteRentalModal({
  rental,
  car,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const completeRental = useCompleteRental();
  const [partialMode, setPartialMode] = useState(false);
  const [partialAmountStr, setPartialAmountStr] = useState("");
  const [ownerSettlement, setOwnerSettlement] = useState<OwnerSettlement | null>(null);

  const expected = rental
    ? calcExpectedWeb(rental.startedAt, rental.dailyRate, rental.plannedDays)
    : { days: 0, baseAmount: 0, lateHours: 0, lateCharge: 0, amount: 0 };
  const partialPaid = parseInt(partialAmountStr.replace(/,/g, ""), 10) || 0;
  const totalDue = expected.amount;
  const partialRemaining = Math.max(0, totalDue - (rental?.paidAmount ?? 0) - partialPaid);
  const collectedAfterPartial = rental
    ? Math.min(totalDue, (rental.paidAmount ?? 0) + partialPaid)
    : 0;

  useEffect(() => {
    if (open) setOwnerSettlement(null);
  }, [open, rental?.id]);

  const submit = (isPaid: boolean, partialAmount?: number) => {
    if (!rental) return;
    if (car?.ownershipType === "external" && !ownerSettlement) {
      toast({ title: "حدد تسوية حصة المالك أولاً", variant: "destructive" });
      return;
    }
    completeRental.mutate(
      { id: rental.id, data: {
        action: "complete",
        isPaid,
        ...(partialAmount !== undefined ? { partialAmount } : {}),
        ...(ownerSettlement ? { ownerSettlement } : {}),
      } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
          if (car?.ownershipType === "external") {
            queryClient.invalidateQueries({ queryKey: getGetOwnerAccountsQueryKey() });
          }
           const ownerMsg = car?.ownershipType === "external"
             ? ownerSettlement === "transferred" ? " وتم تحويل حصة المالك" : " وسُجلت حصة المالك كدين"
             : "";
           const msg = partialAmount !== undefined
            ? `تم تسجيل ${partialAmount.toLocaleString('en-US')} ريال دخلاً والباقي ديناً`
             : isPaid ? `تم تسديد الإيجار بنجاح${ownerMsg}` : `تم تسجيل الإيجار كدين${ownerMsg}`;
          toast({ title: msg });
          setPartialMode(false);
          setPartialAmountStr("");
          onOpenChange(false);
        },
        onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
      }
    );
  };

  const handlePartial = () => {
    if (!partialPaid || partialPaid <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    if (partialPaid >= Math.max(0, totalDue - (rental?.paidAmount ?? 0))) {
      submit(true);
      return;
    }
    submit(true, partialPaid);
  };

  const cancel = () => {
    if (!rental) return;
    if (!window.confirm("سيتم إلغاء التأجير وإزالة أي دفعات مرتبطة به من الحسابات. هل تريد المتابعة؟")) return;
    completeRental.mutate(
      { id: rental.id, data: { action: "cancel", isPaid: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListIncomeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListDebtsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOwnerAccountsQueryKey() });
          toast({ title: "تم إلغاء التأجير بدون احتساب مبلغ" });
          setPartialMode(false);
          setPartialAmountStr("");
          setOwnerSettlement(null);
          onOpenChange(false);
        },
        onError: (error) => toast({
          title: error instanceof Error ? error.message : "لا يمكن إلغاء التأجير",
          variant: "destructive",
        }),
      }
    );
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setPartialMode(false);
      setPartialAmountStr("");
      setOwnerSettlement(null);
    }
    onOpenChange(v);
  };

  if (!rental) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{partialMode ? "محاسبة جزئية" : "إنهاء التأجير"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">السيارة:</span>
              <span className="font-semibold">{rental.carModel} ({rental.carPlate})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأيام المكتملة:</span>
              <span className="font-semibold">{expected.days} أيام</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>الإجمالي المستحق:</span>
                <span className="text-primary">{totalDue.toLocaleString('en-US')} ريال</span>
            </div>
              {expected.lateHours > 0 && (
                <p className="text-xs text-orange-600">
                  تمت إضافة {expected.lateHours} ساعة تأخير تلقائياً بقيمة {expected.lateCharge.toLocaleString("en-US")} ريال.
                </p>
              )}
          </div>

          {partialMode ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1 text-right">دفعة الإغلاق (ريال)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-right text-base bg-background"
                  placeholder="0"
                  value={partialAmountStr}
                  onChange={e => setPartialAmountStr(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-between text-sm p-3 rounded-lg bg-destructive/10">
                <span className="text-destructive font-semibold">الباقي يُسجل كدين:</span>
                <span className="text-destructive font-bold">{partialRemaining.toLocaleString('en-US')} ريال</span>
              </div>
              <OwnerSettlementChooser
                car={car}
                value={ownerSettlement}
                onChange={setOwnerSettlement}
                collectedAmount={collectedAfterPartial}
              />
              <div className="flex gap-3">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handlePartial} disabled={completeRental.isPending}>
                  تأكيد
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setPartialMode(false); setPartialAmountStr(""); }}>
                  رجوع
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <OwnerSettlementChooser
                car={car}
                value={ownerSettlement}
                onChange={setOwnerSettlement}
              />
              <Button
                variant="outline"
                className="w-full h-11 border-orange-500/60 text-orange-700 hover:bg-orange-500/10"
                onClick={cancel}
                disabled={completeRental.isPending}
              >
                تم إلغاء التأجير — السيارة رجعت بدون احتساب
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 h-12" onClick={() => submit(true)} disabled={completeRental.isPending}>
                مدفوع بالكامل
              </Button>
              <Button className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setPartialMode(true)} disabled={completeRental.isPending}>
                ½ محاسب كجزء
              </Button>
              <Button variant="destructive" className="w-full h-12" onClick={() => submit(false)} disabled={completeRental.isPending}>
                تسجيل كدين
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Update Rate Modal
const updateRateSchema = z.object({
  zone: z.enum([UpdateRentalRateBodyZone.inside, UpdateRentalRateBodyZone.outside]),
  dailyRate: z.coerce.number().min(1, "السعر مطلوب"),
  plannedDays: z.coerce.number().int().min(1).nullable().optional(),
});

function UpdateRateModal({
  rental,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateRate = useUpdateRentalRate();

  const form = useForm<z.infer<typeof updateRateSchema>>({
    resolver: zodResolver(updateRateSchema),
    defaultValues: {
      zone: rental?.zone || UpdateRentalRateBodyZone.inside,
      dailyRate: rental?.dailyRate || 0,
      plannedDays: rental?.plannedDays ?? null,
    },
  });

  useEffect(() => {
    if (rental) {
      form.reset({
        zone: rental.zone,
        dailyRate: rental.dailyRate,
        plannedDays: rental.plannedDays ?? null,
      });
    }
  }, [rental, form]);

  const onSubmit = (data: z.infer<typeof updateRateSchema>) => {
    if (!rental) return;
    
    updateRate.mutate(
      { id: rental.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey() });
          toast({ title: "تم تحديث السعر بنجاح" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "حدث خطأ أثناء تحديث السعر", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل السعر/النطاق</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النطاق</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النطاق" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UpdateRentalRateBodyZone.inside}>داخل صنعاء</SelectItem>
                      <SelectItem value={UpdateRentalRateBodyZone.outside}>خارج صنعاء</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر اليومي (ريال)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plannedDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة التأجير</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {([null, 1, 2, 3, 5, 7, 10, 14, 30] as Array<number | null>).map((d) => (
                          <button
                            key={d ?? 0}
                            type="button"
                            onClick={() => field.onChange(d)}
                            className={
                              field.value === d
                                ? "px-3 py-1.5 rounded-lg border text-sm font-medium bg-primary text-primary-foreground border-primary"
                                : "px-3 py-1.5 rounded-lg border text-sm font-medium bg-background text-muted-foreground border-border hover:border-primary/60 transition-colors"
                            }
                          >
                            {d === null ? "مفتوح" : `${d}`}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="مخصص..."
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                          }
                          className="w-28 text-center"
                        />
                        <span className="text-sm text-muted-foreground">يوم</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateRate.isPending}>
                تحديث
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// New Rental Modal
const newRentalSchema = z.object({
  carId: z.coerce.number().min(1, "السيارة مطلوبة"),
  zone: z.enum([CreateRentalBodyZone.inside, CreateRentalBodyZone.outside]),
  dailyRate: z.coerce.number().min(1, "السعر مطلوب"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  plannedDays: z.coerce.number().int().min(1).nullable().optional(),
});

function NewRentalModal({
  open,
  onOpenChange,
  cars,
  reservations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cars: Car[];
  reservations: Reservation[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRental = useCreateRental();

  const availableCars = cars.filter((c) => c.isAvailable);

  const form = useForm<z.infer<typeof newRentalSchema>>({
    resolver: zodResolver(newRentalSchema),
    defaultValues: {
      carId: undefined,
      zone: CreateRentalBodyZone.inside,
      dailyRate: 0,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      plannedDays: null,
    },
  });

  const selectedCarId = form.watch("carId");
  const selectedZone = form.watch("zone");
  const selectedPlannedDays = form.watch("plannedDays");

  // Find upcoming reservations for the selected car
  const carReservations = reservations.filter(
    (r) =>
      r.carId === selectedCarId &&
      (r.status === "pending" || r.status === "confirmed") &&
      new Date(r.startDate) > new Date()
  );

  // Check if the new rental would conflict with any reservation
  const conflictingReservation = carReservations.find((r) => {
    const reservationStart = new Date(r.startDate);
    if (!selectedPlannedDays || selectedPlannedDays <= 0) return true; // open-ended always conflicts
    const rentalEndDate = new Date(Date.now() + selectedPlannedDays * DAY_MS_WEB);
    return rentalEndDate > reservationStart;
  });

  useEffect(() => {
    if (selectedCarId) {
      const car = cars.find((c) => c.id === selectedCarId);
      if (car) {
        form.setValue(
          "dailyRate",
          selectedZone === CreateRentalBodyZone.inside ? car.defaultRateInside : car.defaultRateOutside
        );
      }
    }
  }, [selectedCarId, selectedZone, cars, form]);

  const onSubmit = (data: z.infer<typeof newRentalSchema>) => {
    createRental.mutate(
      {
        data: {
          ...data,
          customerPhone: data.customerPhone?.trim() || undefined,
          plannedDays: data.plannedDays ?? undefined,
        },
      },
      {
        onSuccess: (rental) => {
          queryClient.invalidateQueries({ queryKey: getListRentalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
          toast({ title: "تم بدء التأجير بنجاح" });
          onOpenChange(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "حدث خطأ أثناء بدء التأجير", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>بدء تأجير جديد</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="carId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السيارة</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر سيارة متاحة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCars.map((car) => (
                        <SelectItem key={car.id} value={car.id.toString()}>
                          {car.model} ({car.plateNumber})
                        </SelectItem>
                      ))}
                      {availableCars.length === 0 && (
                        <SelectItem value="0" disabled>لا توجد سيارات متاحة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>النطاق</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النطاق" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CreateRentalBodyZone.inside}>داخل صنعاء</SelectItem>
                      <SelectItem value={CreateRentalBodyZone.outside}>خارج صنعاء</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر اليومي (ريال)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="اسم المستأجر" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="777000000" type="tel" dir="ltr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان العميل (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="الحي أو العنوان" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plannedDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة التأجير</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {([null, 1, 2, 3, 5, 7, 10, 14, 30] as Array<number | null>).map((d) => (
                          <button
                            key={d ?? 0}
                            type="button"
                            onClick={() => field.onChange(d)}
                            className={
                              field.value === d
                                ? "px-3 py-1.5 rounded-lg border text-sm font-medium bg-primary text-primary-foreground border-primary"
                                : "px-3 py-1.5 rounded-lg border text-sm font-medium bg-background text-muted-foreground border-border hover:border-primary/60 transition-colors"
                            }
                          >
                            {d === null ? "مفتوح" : `${d}`}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="مخصص..."
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                          }
                          className="w-28 text-center"
                        />
                        <span className="text-sm text-muted-foreground">يوم</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {conflictingReservation && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">هذه السيارة محجوزة</p>
                  <p className="text-xs mt-0.5">
                    يوجد حجز بتاريخ{" "}
                    {new Date(conflictingReservation.startDate).toLocaleDateString("ar-SA")}
                    {conflictingReservation.customerName ? ` للعميل ${conflictingReservation.customerName}` : ""}
                    {(!selectedPlannedDays || selectedPlannedDays <= 0)
                      ? " — حدّد مدة التأجير للتحقق من التعارض"
                      : " — موعد تسليم السيارة بعد بدء الحجز"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createRental.isPending || availableCars.length === 0}>
                بدء التأجير
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function Rentals() {
  const shareAccess = useShareAccess();
  const { data: rentals, isLoading: isRentalsLoading, error: rentalsError } = useListRentals({ status: "active" });
  const { data: cars, isLoading: isCarsLoading } = useListCars();

  const { data: reservations = [] } = useListReservations();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [completeRental, setCompleteRental] = useState<Rental | null>(null);
  const [paymentRental, setPaymentRental] = useState<Rental | null>(null);
  const [updateRateRental, setUpdateRateRental] = useState<Rental | null>(null);

  useRentalNotifications(rentals);

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.key === "n") { e.preventDefault(); setIsNewModalOpen(true); }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleShortcut]);

  const sortedRentals = useMemo(() => {
    if (!rentals) return [];
    const priority: Record<DueStatus, number> = { overdue: 0, "due-soon": 1, ok: 2, open: 3 };
    return [...rentals].sort(
      (a, b) =>
        priority[getRentalDueStatus(a.startedAt, a.plannedDays)] -
        priority[getRentalDueStatus(b.startedAt, b.plannedDays)]
    );
  }, [rentals]);

  if (isRentalsLoading || isCarsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (rentalsError || !rentals || !cars) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-destructive rounded-xl bg-destructive/5">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p>فشل في تحميل بيانات التأجير.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">التأجيرات النشطة</h2>
          <p className="text-muted-foreground mt-1">متابعة السيارات المؤجرة حالياً</p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)} className="gap-2 shadow-md">
          <Timer className="h-4 w-4" />
          بدء تأجير جديد
          <kbd className="text-xs opacity-60 border rounded px-1 ml-1 hidden sm:inline">Alt+N</kbd>
        </Button>
      </div>

      {rentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
          <CheckCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">لا توجد تأجيرات نشطة</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            جميع السيارات متاحة حالياً. ابدأ تأجير جديد لكسب الدخل.
          </p>
          <Button onClick={() => setIsNewModalOpen(true)} variant="outline">
            تأجير سيارة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedRentals.map((rental) => {
            const due = getRentalDueInfo(rental.startedAt, rental.plannedDays);
            return (
            <Card
              key={rental.id}
              className={[
                "overflow-hidden border-t-4 shadow-sm hover:shadow-md transition-shadow",
                due.status === "overdue"
                  ? "border-t-destructive ring-1 ring-destructive/30"
                  : due.status === "due-soon"
                  ? "border-t-orange-500 ring-1 ring-orange-500/30"
                  : due.status === "ok"
                  ? "border-t-green-500"
                  : "border-t-primary",
              ].join(" ")}
            >
              {/* Status strip — always visible */}
              <div
                className={[
                  "flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b",
                  due.status === "overdue"
                    ? "bg-destructive text-destructive-foreground border-destructive/20"
                    : due.status === "due-soon"
                    ? "bg-orange-500 text-white border-orange-600/20"
                    : due.status === "ok"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                    : "bg-muted/40 text-muted-foreground border-border",
                ].join(" ")}
              >
                <AlertCircle
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    due.status === "overdue" || due.status === "due-soon" ? "animate-pulse" : "",
                  ].join(" ")}
                />
                {due.status === "overdue" && (
                  <span>
                    تجاوز موعد التسليم
                    {due.overdueDays > 0 && ` بـ ${due.overdueDays} يوم`}
                    {due.overdueHours > 0 && ` و ${due.overdueHours} ساعة`}
                  </span>
                )}
                {due.status === "due-soon" && (
                  <span>موعد التسليم خلال {due.remainingHours} ساعة</span>
                )}
                {due.status === "ok" && (
                  <span>
                    موعد التسليم بعد{" "}
                    {due.remainingDays > 0 && `${due.remainingDays} يوم`}
                    {due.remainingDays > 0 && due.remainingHours > 0 && " و "}
                    {due.remainingHours > 0 && `${due.remainingHours} ساعة`}
                  </span>
                )}
                {due.status === "open" && <span>بلا موعد تسليم — تأجير مفتوح</span>}
              </div>
              <CarPhotoThumb carId={rental.carId} />
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{rental.carModel}</CardTitle>
                    <p className="text-sm font-mono mt-1 text-muted-foreground bg-background inline-block px-2 py-1 rounded border">
                      {rental.carPlate}
                    </p>
                  </div>
                  <LiveTimer startedAt={rental.startedAt} plannedDays={rental.plannedDays} />
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{rental.customerName || "غير محدد"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{rental.zone === "inside" ? "داخل صنعاء" : "خارج صنعاء"}</span>
                  </div>
                  {rental.customerPhone ? (
                    <a
                      href={`tel:${rental.customerPhone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span dir="ltr" className="underline underline-offset-2">{rental.customerPhone}</span>
                    </a>
                  ) : (
                    <div />
                  )}
                  {rental.plannedDays ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>{rental.plannedDays} {rental.plannedDays === 1 ? "يوم" : "أيام"}</span>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span>{rental.dailyRate.toLocaleString('en-US')} ريال/يوم</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <span>المحصل: {(rental.paidAmount ?? 0).toLocaleString('en-US')} ريال</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <span>الإجمالي الحالي: {calcExpectedWeb(rental.startedAt, rental.dailyRate, rental.plannedDays).amount.toLocaleString('en-US')} ريال</span>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${shareAccess ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-5"} gap-2 pt-4 border-t`}>
                  <Button
                    variant="outline"
                    className="gap-2 border-green-500/50 text-green-700 hover:bg-green-500/10"
                    onClick={() => setPaymentRental(rental)}
                    data-testid={`button-payment-${rental.id}`}
                  >
                    <Banknote className="h-4 w-4" />
                    تحصيل دفعة
                  </Button>
                  <Button 
                    className="gap-2"
                    onClick={() => setCompleteRental(rental)}
                    data-testid={`button-complete-rental-${rental.id}`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    إنهاء التأجير
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setUpdateRateRental(rental)}
                    data-testid={`button-update-rate-${rental.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل السعر/النطاق
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <NewRentalModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        cars={cars}
        reservations={reservations}
      />
      <CompleteRentalModal
        open={!!completeRental}
        onOpenChange={(open) => !open && setCompleteRental(null)}
        rental={completeRental}
        car={cars.find((car) => car.id === completeRental?.carId) ?? null}
      />
      <CollectPaymentModal
        open={!!paymentRental}
        onOpenChange={(open) => !open && setPaymentRental(null)}
        rental={paymentRental}
      />
      <UpdateRateModal
        open={!!updateRateRental}
        onOpenChange={(open) => !open && setUpdateRateRental(null)}
        rental={updateRateRental}
      />
    </div>
  );
}
