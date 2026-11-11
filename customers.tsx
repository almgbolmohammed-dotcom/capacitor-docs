import { useState } from "react";
import {
  getListCustomersQueryKey,
  useListCustomers,
} from "@workspace/api-client-react";
import type { CustomerProfile, CustomerRentalHistory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { UserRound, Phone, MapPin, CalendarDays, Car, Search, RefreshCw, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useWebCarPhotos } from "@/hooks/use-car-photos";

type SortKey = "rentals" | "profit" | "recent" | "oldest";
const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "rentals", label: "الأكثر تأجيراً" },
  { value: "profit", label: "الأكثر ربحاً" },
  { value: "recent", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
];

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(value);

function CustomerHistoryRow({ history }: { history: CustomerRentalHistory }) {
  const photos = useWebCarPhotos(history.carId);
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 p-2.5 text-xs">
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-16 h-14 rounded-lg overflow-hidden bg-muted border shrink-0 flex items-center justify-center">
          {photos[0] ? (
            <img
              src={photos[0]}
              alt={`صورة ${history.carModel}`}
              className="w-full h-full object-cover"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          ) : (
            <ImageOff className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{history.carModel} <span className="text-muted-foreground">({history.carPlate})</span></p>
          <p className="text-muted-foreground mt-1">{format(new Date(history.startedAt), "EEEE dd/MM/yyyy", { locale: ar })} — {history.plannedDays ? `${history.plannedDays} يوم مخطط` : "مفتوح"}</p>
        </div>
      </div>
      <div className="text-left shrink-0">
        <p className="font-semibold">{fmt(history.paidAmount)} ريال</p>
         <p className="text-muted-foreground mt-1">
           {history.status === "active" ? "نشط" : history.status === "cancelled" ? "ملغى بدون حساب" : `${history.daysCount} يوم`}
         </p>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [sort, setSort] = useState<SortKey>("rentals");
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useListCustomers({ sort });
  const queryClient = useQueryClient();
  const visible = (customers as CustomerProfile[]).filter((customer) => {
    const needle = search.trim().toLocaleLowerCase("ar");
    return !needle || `${customer.name} ${customer.phone} ${customer.address}`.toLocaleLowerCase("ar").includes(needle);
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">معلومات الزبائن</h2>
          <p className="text-muted-foreground mt-1">ملفات العملاء وسجل تعاملاتهم وتحليل الإيرادات</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey({ sort }) })}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {SORTS.map((item) => (
          <Button key={item.value} size="sm" variant={sort === item.value ? "default" : "outline"} onClick={() => setSort(item.value)}>
            {item.label}
          </Button>
        ))}
        <div className="relative mr-auto min-w-[220px]">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو الجوال..." />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-64 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><UserRound className="mx-auto h-12 w-12 mb-3 opacity-40" /><p>لا توجد ملفات زبائن بعد</p><p className="text-xs mt-1">سيتم إنشاء الملف تلقائياً عند تسجيل أول تأجير.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visible.map((customer) => (
            <Card key={`${customer.phone}-${customer.name}`} className="overflow-hidden border-t-4 border-t-primary">
              <CardHeader className="bg-muted/20 pb-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-primary" />{customer.name || "زبون بدون اسم"}</CardTitle>
                    {customer.phone && <a href={`tel:${customer.phone}`} className="text-sm text-primary inline-flex items-center gap-1 mt-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{customer.phone}</a>}
                    {customer.address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{customer.address}</p>}
                  </div>
                  <Badge variant="secondary">{customer.rentalCount} تأجير</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-primary/5 p-3"><p className="text-muted-foreground text-xs">إجمالي المدفوع</p><p className="font-bold text-primary mt-1">{fmt(customer.totalPaid)} ريال</p></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-muted-foreground text-xs">آخر تعامل</p><p className="font-bold mt-1">{format(new Date(customer.lastRentalAt), "dd/MM/yyyy", { locale: ar })}</p></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {customer.vehicles.map((vehicle) => <Badge key={vehicle} variant="outline" className="gap-1"><Car className="h-3 w-3" />{vehicle}</Badge>)}
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-1"><CalendarDays className="h-4 w-4 text-primary" />سجل التأجيرات</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customer.history.map((history) => <CustomerHistoryRow key={history.rentalId} history={history} />)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}