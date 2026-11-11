import { useState, useEffect, useCallback, useRef } from "react";
import { useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCars,
  useCreateCar,
  useUpdateCar,
  useDeleteCar,
  useGetCarActivity,
  useDeleteCarActivity,
  getListCarsQueryKey,
  getGetCarActivityQueryKey,
  useListRentals,
  useListReservations,
  useCreateReservation,
  useUpdateReservation,
  useDeleteReservation,
  getListReservationsQueryKey,
  useListMaintenance,
  useCreateMaintenance,
  useUpdateMaintenance,
  useDeleteMaintenance,
  getListMaintenanceQueryKey,
} from "@workspace/api-client-react";
import type { Car, CarActivityItem, GetCarActivityParams } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const CAR_MODELS = [
  "تويوتا كامري",
  "تويوتا كورولا",
  "تويوتا لاند كروزر",
  "تويوتا هايلاندر",
  "تويوتا هايلوكس",
  "تويوتا راف4",
  "تويوتا يارس",
  "تويوتا أفالون",
  "هيونداي سوناتا",
  "هيونداي إيلانترا",
  "هيونداي توسان",
  "هيونداي سانتافي",
  "هيونداي أكسنت",
  "كيا سيراتو",
  "كيا سبورتاج",
  "كيا سورينتو",
  "كيا أوبتيما",
  "نيسان صني",
  "نيسان التيما",
  "نيسان باترول",
  "نيسان مكسيما",
  "هوندا سيفيك",
  "هوندا أكورد",
  "هوندا سي آر في",
  "شيفروليه كابريس",
  "شيفروليه ماليبو",
  "ميتسوبيشي لانسر",
  "ميتسوبيشي باجيرو",
  "سوزوكي سيليريو",
  "سكودا أوكتافيا",
];
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Car as CarIcon, Plus, Pencil, Trash2, AlertCircle, History, ImageIcon, X, Phone } from "lucide-react";
import {
  loadWebCarPhotos,
  saveWebCarPhotos,
  compressAndConvert,
  useWebCarPhotos,
} from "@/hooks/use-car-photos";

const carSchema = z.object({
  plateNumber: z.string().min(1, "رقم اللوحة مطلوب"),
  model: z.string().min(1, "الموديل مطلوب"),
  defaultRateInside: z.coerce.number().min(1, "السعر داخل صنعاء مطلوب"),
  defaultRateOutside: z.coerce.number().min(1, "السعر خارج صنعاء مطلوب"),
  ownershipType: z.enum(["office", "external"]).default("office"),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerCommissionPercent: z.coerce.number().int().min(0).max(100).default(0),
});

type CarFormValues = z.infer<typeof carSchema>;

function CarFormModal({
  car,
  open,
  onOpenChange,
}: {
  car?: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCar = useCreateCar();
  const updateCar = useUpdateCar();
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      plateNumber: car?.plateNumber || "",
      model: car?.model || "",
      defaultRateInside: car?.defaultRateInside || 0,
      defaultRateOutside: car?.defaultRateOutside || 0,
      ownershipType: car?.ownershipType || "office",
      ownerName: car?.ownerName || "",
      ownerPhone: car?.ownerPhone || "",
      ownerCommissionPercent: car?.ownerCommissionPercent || 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        plateNumber: car?.plateNumber || "",
        model: car?.model || "",
        defaultRateInside: car?.defaultRateInside || 0,
        defaultRateOutside: car?.defaultRateOutside || 0,
        ownershipType: car?.ownershipType || "office",
        ownerName: car?.ownerName || "",
        ownerPhone: car?.ownerPhone || "",
        ownerCommissionPercent: car?.ownerCommissionPercent || 0,
      });
      setFormPhotos(car ? loadWebCarPhotos(car.id) : []);
    }
  }, [open, car, form]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPhotoLoading(true);
    try {
      const urls = await Promise.all(files.map(compressAndConvert));
      setFormPhotos((prev) => [...prev, ...urls]);
    } catch {
      toast({ title: "تعذّر تحميل الصور", variant: "destructive" });
    } finally {
      setPhotoLoading(false);
      setFileKey((k) => k + 1);
    }
  };

  const onSubmit = (data: CarFormValues) => {
    if (car) {
      updateCar.mutate(
        { id: car.id, data },
        {
          onSuccess: () => {
            saveWebCarPhotos(car.id, formPhotos);
            queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
            toast({ title: "تم تحديث السيارة بنجاح" });
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: "حدث خطأ أثناء تحديث السيارة", variant: "destructive" });
          },
        }
      );
    } else {
      createCar.mutate(
        { data },
        {
          onSuccess: (result) => {
            saveWebCarPhotos(result.id, formPhotos);
            queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
            toast({ title: "تم إضافة السيارة بنجاح" });
            onOpenChange(false);
            form.reset();
          },
          onError: () => {
            toast({ title: "حدث خطأ أثناء إضافة السيارة", variant: "destructive" });
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{car ? "تعديل بيانات سيارة" : "إضافة سيارة جديدة"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم اللوحة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: 12345/1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع السيارة</FormLabel>
                  <FormControl>
                    <div>
                      <Input
                        list="car-models-list"
                        placeholder="اختر من القائمة أو اكتب يدويًا..."
                        {...field}
                        autoComplete="off"
                      />
                      <datalist id="car-models-list">
                        {CAR_MODELS.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultRateInside"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر الافتراضي داخل صنعاء (ريال)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultRateOutside"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر الافتراضي خارج صنعاء (ريال)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <label className="text-sm font-medium">ملكية السيارة وتوزيع الأرباح</label>
              <select
                {...form.register("ownershipType")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="office">ملك المكتب — كامل الدخل للمكتب</option>
                <option value="external">ملك شخص آخر — حساب عمولة المكتب</option>
              </select>
              {form.watch("ownershipType") === "external" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">اسم المالك</label>
                    <Input placeholder="اسم مالك السيارة" {...form.register("ownerName")} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">رقم هاتف المالك</label>
                    <Input placeholder="777000000" dir="ltr" {...form.register("ownerPhone")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">عمولة المكتب (%)</label>
                    <Input type="number" min="0" max="100" {...form.register("ownerCommissionPercent")} />
                    <p className="text-[11px] text-muted-foreground mt-1">تُخصم العمولة من المبلغ المحصل ويظهر الباقي كمستحق للمالك.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Photo section */}
            <div>
              <p className="text-sm font-medium mb-2">صور السيارة</p>
              {formPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formPhotos.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="w-20 h-16 object-cover rounded-lg border"
                        onError={() =>
                          setFormPhotos((prev) => prev.filter((u) => u !== url))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setFormPhotos((p) => p.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                className={[
                  "inline-flex items-center gap-2 cursor-pointer",
                  "h-8 rounded-md border border-input bg-background px-3 text-xs font-medium",
                  "ring-offset-background transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  photoLoading ? "opacity-50 pointer-events-none" : "",
                ].join(" ")}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{photoLoading ? "جاري التحميل..." : "إضافة صور"}</span>
                <input
                  key={fileKey}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={photoLoading}
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={createCar.isPending || updateCar.isPending}>
                {car ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CarCard({
  car,
  onEdit,
  onActivity,
}: {
  car: Car;
  onEdit: (car: Car) => void;
  onActivity: (car: Car) => void;
}) {
  const photos = useWebCarPhotos(car.id);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-t-4 border-t-primary/80">
      {photos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto p-2 pb-0 bg-muted/20">
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-24 w-36 object-cover rounded-lg shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ))}
        </div>
      )}
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{car.model}</CardTitle>
            <p className="text-sm font-mono mt-1 text-muted-foreground bg-background inline-block px-2 py-1 rounded border">
              {car.plateNumber}
            </p>
          </div>
          <Badge
            variant={car.isAvailable ? "default" : "secondary"}
            className={car.isAvailable ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {car.isAvailable ? "متاحة" : "مؤجرة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">داخل صنعاء</p>
            <p className="font-bold text-foreground">
              {car.defaultRateInside.toLocaleString("en-US")}{" "}
              <span className="font-normal text-xs text-muted-foreground">ريال/يوم</span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">خارج صنعاء</p>
            <p className="font-bold text-foreground">
              {car.defaultRateOutside.toLocaleString("en-US")}{" "}
              <span className="font-normal text-xs text-muted-foreground">ريال/يوم</span>
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t mt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => onActivity(car)}
          >
            <History className="h-3.5 w-3.5" />
            سجل النشاط
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(car)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteCarButton car={car} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteCarButton({ car }: { car: Car }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteCar = useDeleteCar();

  const handleDelete = () => {
    deleteCar.mutate(
      { id: car.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCarsQueryKey() });
          toast({ title: "تم حذف السيارة بنجاح" });
        },
        onError: () => {
          toast({ title: "حدث خطأ أثناء حذف السيارة", variant: "destructive" });
        },
      }
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد من حذف السيارة؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف السيارة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CarActivitySheet({ car, open, onOpenChange }: { car: Car | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const [deleteTarget, setDeleteTarget] = useState<CarActivityItem | null>(null);

  const { data: activity, isLoading } = useGetCarActivity(
    car?.id ?? 0,
    { period } as GetCarActivityParams,
    { query: { enabled: !!car, queryKey: getGetCarActivityQueryKey(car?.id ?? 0, { period } as GetCarActivityParams) } }
  );

  const deleteActivity = useDeleteCarActivity();

  const handleDelete = () => {
    if (!deleteTarget || !car) return;
    deleteActivity.mutate(
      { id: car.id, activityId: deleteTarget.id, params: { type: deleteTarget.type } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCarActivityQueryKey(car.id, { period } as GetCarActivityParams) });
          toast({ title: "تم حذف النشاط بنجاح" });
          setDeleteTarget(null);
        },
        onError: () => {
          toast({ title: "فشل الحذف", variant: "destructive" });
          setDeleteTarget(null);
        },
      }
    );
  };

  const ActivityList = ({ items }: { items: CarActivityItem[] }) => {
    if (isLoading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;
    if (!items.length) return (
      <div className="p-12 text-center text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>لا يوجد نشاط في هذه الفترة</p>
      </div>
    );
    return (
      <div className="divide-y">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge
                    variant={item.type === "income" ? "default" : "destructive"}
                    className={item.type === "income" ? "bg-green-600 hover:bg-green-700 text-xs" : "text-xs"}
                  >
                    {item.type === "income" ? "محصّل" : item.isSettled ? "دين مسدد" : "دين"}
                  </Badge>
                  <span className="text-sm font-bold text-foreground">
                    {item.totalAmount.toLocaleString('en-US')} ريال
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({item.daysCount} يوم × {item.dailyRate.toLocaleString('en-US')})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">من:</span>
                  <span dir="ltr" className="font-mono">
                    {format(new Date(item.startedAt), 'dd/MM/yyyy', { locale: ar })}
                    {' '}
                    <span className="text-primary font-semibold">{format(new Date(item.startedAt), 'HH:mm')}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">إلى:</span>
                  <span dir="ltr" className="font-mono">
                    {format(new Date(item.completedAt), 'dd/MM/yyyy', { locale: ar })}
                    {' '}
                    <span className="text-primary font-semibold">{format(new Date(item.completedAt), 'HH:mm')}</span>
                  </span>
                </div>

                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{item.zone === "inside" ? "داخل صنعاء" : "خارج صنعاء"}</span>
                  {item.customerName && <span>• {item.customerName}</span>}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0 mt-1"
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col" dir="rtl">
          <SheetHeader className="p-5 border-b bg-card">
            <SheetTitle className="text-right flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              سجل نشاط {car?.model}
              <span className="text-sm font-normal text-muted-foreground font-mono">({car?.plateNumber})</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month" | "all")} className="w-full">
              <TabsList className="w-full rounded-none border-b bg-muted/30 h-auto p-0">
                <TabsTrigger value="week" className="flex-1 rounded-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  هذا الأسبوع
                </TabsTrigger>
                <TabsTrigger value="month" className="flex-1 rounded-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  هذا الشهر
                </TabsTrigger>
                <TabsTrigger value="all" className="flex-1 rounded-none py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  الكل
                </TabsTrigger>
              </TabsList>
              <TabsContent value="week" className="mt-0">
                <ActivityList items={activity ?? []} />
              </TabsContent>
              <TabsContent value="month" className="mt-0">
                <ActivityList items={activity ?? []} />
              </TabsContent>
              <TabsContent value="all" className="mt-0">
                <ActivityList items={activity ?? []} />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف النشاط</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              حذف
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AllCarsTab({ onEdit, onActivity }: { onEdit: (c: Car) => void; onActivity: (c: Car) => void }) {
  const { data: cars, isLoading, error } = useListCars();
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-48 rounded-xl"/>)}</div>;
  if (error || !cars) return <div className="flex items-center gap-3 p-6 border border-destructive rounded-xl bg-destructive/5"><AlertCircle className="h-5 w-5 text-destructive"/><p>فشل في تحميل بيانات السيارات.</p></div>;
  if (!cars.length) return (
    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
      <CarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50"/>
      <h3 className="text-lg font-semibold mb-2">لا توجد سيارات</h3>
      <p className="text-muted-foreground max-w-sm">قم بإضافة سيارتك الأولى للبدء في إدارة التأجير.</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cars.map(car => <CarCard key={car.id} car={car} onEdit={onEdit} onActivity={onActivity}/>)}
    </div>
  );
}

function RentedCarPhoto({ carId }: { carId: number }) {
  const photos = useWebCarPhotos(carId);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt="" className="w-full h-28 object-cover"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

function RentedCarsTab() {
  const { data: cars } = useListCars();
  const { data: rentals } = useListRentals({ status: "active" });
  const rented = (cars ?? []).filter(c => !c.isAvailable);
  if (!rented.length) return <div className="text-center py-16 text-muted-foreground">لا توجد سيارات مؤجرة حالياً</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {rented.map(car => {
        const rental = (rentals ?? []).find(r => r.carId === car.id);
        return (
          <Card key={car.id} className="overflow-hidden border-t-4 border-t-orange-500">
            <RentedCarPhoto carId={car.id} />
            <CardHeader className="pb-2 bg-muted/20">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{car.model}</CardTitle>
                  <p className="text-sm text-muted-foreground" dir="ltr">{car.plateNumber}</p>
                </div>
                <Badge className="bg-orange-500 text-white shrink-0">مؤجرة</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {rental && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">المستأجر:</span>
                    <span className="font-medium">{rental.customerName || "غير محدد"}</span>
                  </div>
                  {rental.customerPhone && (
                    <a href={`tel:${rental.customerPhone}`} className="flex items-center gap-2 text-sm text-green-600 hover:underline">
                      <Phone className="h-3.5 w-3.5"/>
                      {rental.customerPhone}
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">بدأ:</span>
                    <span>{format(new Date(rental.startedAt), "dd/MM/yyyy HH:mm", { locale: ar })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span>{new Intl.NumberFormat("en-US").format(rental.totalAmount)} ريال</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ReservationCarPhoto({ carId }: { carId: number }) {
  const photos = useWebCarPhotos(carId);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

function ReservedCarsTab() {
  const { data: reservations, isLoading, refetch } = useListReservations();
  const { data: cars } = useListCars();
  const { data: activeRentals } = useListRentals({ status: "active" });
  const queryClient = useQueryClient();
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();
  const deleteReservation = useDeleteReservation();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [zone, setZone] = useState<"inside" | "outside">("inside");
  const [dailyRate, setDailyRate] = useState("");
  const [notes, setNotes] = useState("");

  const carsAvailableForDate = (cars ?? []).filter(c => {
    if (c.isAvailable) return true;
    if (!startDate) return false;
    const resStart = new Date(startDate).getTime();
    const rental = (activeRentals ?? []).find(r => r.carId === c.id);
    if (!rental || !rental.plannedDays) return false;
    const rentalEnd = new Date(rental.startedAt).getTime() + rental.plannedDays * 24 * 60 * 60 * 1000;
    return rentalEnd <= resStart;
  });

  const freeSoon = (cars ?? []).filter(c => {
    if (c.isAvailable) return false;
    if (!startDate) return false;
    const resStart = new Date(startDate).getTime();
    const rental = (activeRentals ?? []).find(r => r.carId === c.id);
    if (!rental || !rental.plannedDays) return false;
    const rentalEnd = new Date(rental.startedAt).getTime() + rental.plannedDays * 24 * 60 * 60 * 1000;
    return rentalEnd <= resStart;
  });

  async function handleAdd() {
    if (!custName || !selectedCar || !startDate || !endDate) return;
    await createReservation.mutateAsync({ data: { carId: selectedCar, customerName: custName, customerPhone: custPhone || undefined, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), zone, dailyRate: parseInt(dailyRate) || 0, notes: notes || undefined } });
    setCustName(""); setCustPhone(""); setSelectedCar(null); setStartDate(""); setEndDate(""); setNotes(""); setDailyRate("");
    setAddOpen(false);
    queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
    toast({ title: "تم إضافة الحجز" });
  }

  async function handleCancel(id: number) {
    await updateReservation.mutateAsync({ id, data: { status: "cancelled" } });
    queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
    toast({ title: "تم إلغاء الحجز" });
  }

  async function handleDelete(id: number) {
    await deleteReservation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
    toast({ title: "تم الحذف" });
  }

  const active = (reservations ?? []).filter(r => r.status === "pending" || r.status === "confirmed");
  const past = (reservations ?? []).filter(r => r.status === "cancelled" || r.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4"/>إضافة حجز</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>حجز جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">من</label>
                  <div dir="ltr"><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} dir="ltr" style={{ direction: "ltr" }}/></div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">إلى</label>
                  <div dir="ltr"><Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} dir="ltr" style={{ direction: "ltr" }}/></div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  اختر السيارة
                  {startDate && freeSoon.length > 0 && (
                    <span className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full mr-2">
                      {freeSoon.length} سيارة ستنتهي تأجيرها قبل موعد الحجز
                    </span>
                  )}
                </label>
                {carsAvailableForDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {startDate ? "لا توجد سيارات متاحة في هذا التاريخ" : "اختر تاريخ البداية أولاً لعرض السيارات المتاحة"}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {carsAvailableForDate.map(c => {
                      const isSoonFree = freeSoon.some(f => f.id === c.id);
                      return (
                        <Button
                          key={c.id}
                          size="sm"
                          variant={selectedCar === c.id ? "default" : "outline"}
                          className={isSoonFree ? "border-orange-400 text-orange-700 dark:text-orange-400" : ""}
                          onClick={() => { setSelectedCar(c.id); if (!dailyRate) setDailyRate(String(zone === "inside" ? c.defaultRateInside : c.defaultRateOutside)); }}
                        >
                          {c.model}
                          {isSoonFree && <span className="text-xs opacity-70 mr-1">(ستنتهي)</span>}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {!startDate && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(cars ?? []).filter(c => c.isAvailable).map(c => (
                      <Button key={c.id} size="sm" variant={selectedCar === c.id ? "default" : "outline"} onClick={() => { setSelectedCar(c.id); if (!dailyRate) setDailyRate(String(zone === "inside" ? c.defaultRateInside : c.defaultRateOutside)); }}>{c.model}</Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">اسم العميل</label><Input value={custName} onChange={e=>setCustName(e.target.value)} placeholder="الاسم"/></div>
                <div><label className="text-sm font-medium mb-1 block">رقم الهاتف</label><Input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="+967" dir="ltr"/></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">السعر اليومي</label>
                <Input type="number" value={dailyRate} onChange={e=>setDailyRate(e.target.value)} dir="ltr"/>
              </div>
              <div><label className="text-sm font-medium mb-1 block">ملاحظات</label><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="اختياري"/></div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAdd} disabled={createReservation.isPending}>حفظ</Button>
                <Button variant="outline" onClick={()=>setAddOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-20"/>)}</div> :
        active.length === 0 ? <div className="text-center py-16 text-muted-foreground">لا توجد حجوزات نشطة</div> :
        <div className="space-y-3">
          {active.map(res => (
            <Card key={res.id} className="border-t-4 border-t-primary">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ReservationCarPhoto carId={res.carId} />
                    <div className="space-y-1 min-w-0">
                    <p className="font-bold">{res.customerName}</p>
                    <p className="text-sm text-muted-foreground">{res.carModel} — <span dir="ltr">{res.carPlate}</span></p>
                    <p className="text-sm">{format(new Date(res.startDate), "dd/MM/yyyy")} → {format(new Date(res.endDate), "dd/MM/yyyy")}</p>
                    {res.customerPhone && <a href={`tel:${res.customerPhone}`} className="text-sm text-green-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5"/>{res.customerPhone}</a>}
                    {res.notes && <p className="text-xs text-muted-foreground">{res.notes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Badge variant={res.status === "confirmed" ? "default" : "secondary"}>{res.status === "confirmed" ? "مؤكد" : "معلق"}</Badge>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={()=>handleCancel(res.id)}>إلغاء</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={()=>handleDelete(res.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

function MaintenanceCarPhoto({ carId }: { carId: number }) {
  const photos = useWebCarPhotos(carId);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

function MaintenanceTab() {
  const { data: maintenanceList, isLoading } = useListMaintenance();
  const { data: cars } = useListCars();
  const queryClient = useQueryClient();
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenance();
  const deleteMaintenance = useDeleteMaintenance();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [selCar, setSelCar] = useState<number | null>(null);
  const [mType, setMType] = useState<"emergency" | "periodic">("emergency");
  const [mDesc, setMDesc] = useState("");
  const [mCost, setMCost] = useState("");
  const [mPaidBy, setMPaidBy] = useState<"customer" | "office">("office");
  const [mEndDate, setMEndDate] = useState("");
  const [mNotes, setMNotes] = useState("");

  async function handleAdd() {
    if (!selCar || !mDesc) return;
    await createMaintenance.mutateAsync({ data: { carId: selCar, type: mType, description: mDesc, cost: mCost ? parseInt(mCost) : undefined, paidBy: mPaidBy, estimatedEndDate: mEndDate ? new Date(mEndDate).toISOString() : undefined, notes: mNotes || undefined } });
    setSelCar(null); setMDesc(""); setMCost(""); setMPaidBy("office"); setMEndDate(""); setMNotes("");
    setAddOpen(false);
    queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
    toast({ title: "تم إضافة الصيانة" });
  }

  async function handleComplete(id: number) {
    await updateMaintenance.mutateAsync({ id, data: { status: "completed" } });
    queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
    toast({ title: "تم تعيين الصيانة كمكتملة" });
  }

  const active = (maintenanceList ?? []).filter(m => m.status === "active");
  const done = (maintenanceList ?? []).filter(m => m.status === "completed").slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" variant="outline"><Plus className="h-4 w-4"/>إضافة صيانة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>إضافة صيانة</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">السيارة</label>
                <div className="flex flex-wrap gap-2">
                  {(cars ?? []).map(c => <Button key={c.id} size="sm" variant={selCar === c.id ? "default" : "outline"} onClick={()=>setSelCar(c.id)}>{c.model}</Button>)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">نوع الصيانة</label>
                <div className="flex gap-2">
                  <Button size="sm" variant={mType === "emergency" ? "destructive" : "outline"} onClick={()=>setMType("emergency")}>صيانة طارئة</Button>
                  <Button size="sm" variant={mType === "periodic" ? "default" : "outline"} onClick={()=>setMType("periodic")}>صيانة دورية</Button>
                </div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">الوصف</label><Input value={mDesc} onChange={e=>setMDesc(e.target.value)} placeholder="وصف الصيانة"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">التكلفة (ريال)</label><Input type="number" value={mCost} onChange={e=>setMCost(e.target.value)} dir="ltr"/></div>
                <div><label className="text-sm font-medium mb-1 block">تاريخ الانتهاء المتوقع</label><Input type="date" value={mEndDate} onChange={e=>setMEndDate(e.target.value)} dir="ltr"/></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">من دفع التكلفة؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" variant={mPaidBy === "customer" ? "default" : "outline"} onClick={() => setMPaidBy("customer")}>
                    الزبون
                  </Button>
                  <Button type="button" size="sm" variant={mPaidBy === "office" ? "default" : "outline"} onClick={() => setMPaidBy("office")}>
                    المكتب
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mPaidBy === "customer" ? "لا تخصم التكلفة من دخل المكتب" : "تسجل التكلفة كمصروف على المكتب"}
                </p>
              </div>
              <div><label className="text-sm font-medium mb-1 block">ملاحظات</label><Input value={mNotes} onChange={e=>setMNotes(e.target.value)} placeholder="اختياري"/></div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAdd} disabled={createMaintenance.isPending}>حفظ</Button>
                <Button variant="outline" onClick={()=>setAddOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-20"/>)}</div> :
        active.length === 0 && done.length === 0 ? <div className="text-center py-16 text-muted-foreground">لا توجد سيارات في الصيانة</div> :
        <div className="space-y-3">
          {active.length > 0 && (
            <>
              <p className="font-semibold text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4 animate-pulse"/>الصيانة النشطة ({active.length})</p>
              {active.map(m => (
                <Card key={m.id} className={`border-t-4 ${m.type === "emergency" ? "border-t-destructive" : "border-t-orange-400"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MaintenanceCarPhoto carId={m.carId} />
                          <p className="font-bold">{m.carModel}</p>
                          <Badge variant={m.type === "emergency" ? "destructive" : "secondary"}>{m.type === "emergency" ? "طارئة" : "دورية"}</Badge>
                        </div>
                        <p className="text-sm">{m.description}</p>
                        {m.estimatedEndDate && <p className="text-xs text-muted-foreground">الانتهاء المتوقع: {format(new Date(m.estimatedEndDate), "dd/MM/yyyy")}</p>}
                         {m.cost && <p className="text-sm font-medium">التكلفة: {new Intl.NumberFormat("en-US").format(m.cost)} ريال — {m.paidBy === "customer" ? "على الزبون" : "على المكتب"}</p>}
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </div>
                      <Button size="sm" onClick={()=>handleComplete(m.id)} className="shrink-0">مكتملة</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <p className="font-semibold text-muted-foreground mt-4">الصيانة المكتملة (آخر 5)</p>
              {done.map(m => (
                <Card key={m.id} className="opacity-60 border-t-4 border-t-green-500">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{m.carModel} — {m.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(m.startDate), "dd/MM/yyyy")}</p>
                      {m.cost && <p className="text-xs mt-1">التكلفة: {new Intl.NumberFormat("en-US").format(m.cost)} ريال — {m.paidBy === "customer" ? "على الزبون" : "على المكتب"}</p>}
                    </div>
                    <Badge className="bg-green-500 text-white">مكتمل</Badge>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      }
    </div>
  );
}

const VALID_TABS = ["all", "rented", "reserved", "maintenance"] as const;
type CarsTab = typeof VALID_TABS[number];

export default function Cars() {
  const search = useSearch();
  const tabFromUrl = (new URLSearchParams(search).get("tab") ?? "all") as CarsTab;
  const initialTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "all";

  const { data: cars } = useListCars();
  const { data: rentals } = useListRentals({ status: "active" });
  const { data: reservations } = useListReservations();
  const { data: maintenanceList } = useListMaintenance({ status: "active" });

  const [activeTab, setActiveTab] = useState<CarsTab>(initialTab);
  const prevSearch = useRef(search);

  useEffect(() => {
    if (search !== prevSearch.current) {
      prevSearch.current = search;
      const tab = (new URLSearchParams(search).get("tab") ?? "all") as CarsTab;
      setActiveTab(VALID_TABS.includes(tab) ? tab : "all");
    }
  }, [search]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | undefined>(undefined);
  const [activityCar, setActivityCar] = useState<Car | null>(null);

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.key === "n") { e.preventDefault(); setEditingCar(undefined); setIsAddModalOpen(true); }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleShortcut]);

  const rentedCount = (cars ?? []).filter(c => !c.isAvailable).length;
  const reservedCount = (reservations ?? []).filter(r => r.status === "pending" || r.status === "confirmed").length;
  const maintenanceCount = (maintenanceList ?? []).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">السيارات</h2>
          <p className="text-muted-foreground mt-1">إدارة أسطول السيارات الكامل</p>
        </div>
        <Button onClick={() => { setEditingCar(undefined); setIsAddModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4"/>
          إضافة سيارة
          <kbd className="text-xs opacity-60 border rounded px-1 ml-1 hidden sm:inline">Alt+N</kbd>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as CarsTab)} dir="rtl">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all" className="gap-1">
            جميع السيارات
            {cars && <Badge variant="secondary" className="text-xs h-5">{cars.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rented" className="gap-1">
            المؤجرة
            {rentedCount > 0 && <Badge className="text-xs h-5 bg-orange-500">{rentedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reserved" className="gap-1">
            المحجوزة
            {reservedCount > 0 && <Badge className="text-xs h-5 bg-blue-500">{reservedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1">
            الصيانة
            {maintenanceCount > 0 && <Badge variant="destructive" className="text-xs h-5">{maintenanceCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllCarsTab onEdit={(c) => { setEditingCar(c); setIsAddModalOpen(true); }} onActivity={setActivityCar}/>
        </TabsContent>
        <TabsContent value="rented" className="mt-4">
          <RentedCarsTab/>
        </TabsContent>
        <TabsContent value="reserved" className="mt-4">
          <ReservedCarsTab/>
        </TabsContent>
        <TabsContent value="maintenance" className="mt-4">
          <MaintenanceTab/>
        </TabsContent>
      </Tabs>

      <CarFormModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} car={editingCar}/>
      <CarActivitySheet car={activityCar} open={!!activityCar} onOpenChange={(v) => !v && setActivityCar(null)}/>
    </div>
  );
}
