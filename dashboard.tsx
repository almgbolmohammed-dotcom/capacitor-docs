import { useGetDashboardSummary, useListCars, useListReservations, useListMaintenance, useListRentals, useGetAccountsSummary, useListContracts, useListCustomers, useGetOwnerAccounts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Car, Timer, Wallet, Receipt, Keyboard, CalendarCheck, Wrench, FileText, TrendingUp, MapPin, User, Phone, CheckCircle, BarChart3, Users, UserRound } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocation } from "wouter";
import { useWebCarPhotos } from "@/hooks/use-car-photos";

function ActivityCarThumb({ carPlate, cars }: { carPlate: string; cars?: { id: number; plateNumber: string }[] }) {
  const car = (cars ?? []).find(c => c.plateNumber === carPlate);
  const photos = useWebCarPhotos(car?.id ?? 0);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt=""
      className="w-10 h-10 rounded-lg object-cover shrink-0 border"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

function RentalThumb({ carId }: { carId: number }) {
  const photos = useWebCarPhotos(carId);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt=""
      className="w-12 h-12 rounded-xl object-cover shrink-0 border-2 border-primary/20"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

const SHORTCUTS = [
  { key: "Alt+H", label: "الرئيسية" },
  { key: "Alt+C", label: "السيارات" },
  { key: "Alt+R", label: "التأجيرات" },
  { key: "Alt+A", label: "الأنشطة المنتهية" },
  { key: "Alt+K", label: "العقود" },
  { key: "Alt+E", label: "الحسابات" },
  { key: "Alt+I", label: "الدخل" },
  { key: "Alt+D", label: "المديونية" },
  { key: "Alt+P", label: "التقارير" },
  { key: "Alt+S", label: "الإعدادات" },
  { key: "Alt+N", label: "إضافة جديد (في كل قسم)" },
];

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();
  const { data: cars } = useListCars();
  const { data: reservations } = useListReservations();
  const { data: maintenance } = useListMaintenance();
  const { data: activeRentals } = useListRentals({ status: "active" });
  const { data: accountsSummary } = useGetAccountsSummary({ period: "month" });
  const { data: contracts } = useListContracts();
  const { data: customers } = useListCustomers({ sort: "recent" });
  const { data: ownerAccounts } = useGetOwnerAccounts();
  const [, navigate] = useLocation();

  const reservationsCount = (reservations ?? []).filter(r => r.status !== "cancelled").length;
  const maintenanceCount = (maintenance ?? []).filter(m => m.status === "active").length;
  const contractsCount = (contracts ?? []).length;
  const customersCount = (customers ?? []).length;
  const ownerCarsCount = (ownerAccounts?.accounts ?? []).reduce((sum, account) => sum + account.carCount, 0);
  const ownerDue = (ownerAccounts?.accounts ?? []).reduce((sum, account) => sum + account.dueToOwner, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">الملخص</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-destructive rounded-xl bg-destructive/5">
        <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
        <p>فشل في تحميل بيانات الملخص.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-3xl font-bold tracking-tight">الملخص</h2>

      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card onClick={() => navigate("/rentals")} className="border-t-4 border-t-primary shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">التأجيرات النشطة</CardTitle>
            <Timer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{summary.activeRentals}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">اضغط للعرض</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+R</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/cars")} className="border-t-4 border-t-secondary shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">السيارات المتاحة</CardTitle>
            <Car className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{summary.availableCars}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">من أصل {summary.totalCars}</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+C</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/income")} className="border-t-4 border-t-green-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الدخل هذا الشهر</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{summary.totalIncomeThisMonth.toLocaleString('en-US')}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">ريال يمني</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+I</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/debts")} className="border-t-4 border-t-destructive shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">إجمالي المديونية</CardTitle>
            <Receipt className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-destructive">{summary.totalDebtOutstanding.toLocaleString('en-US')}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">ريال يمني</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+D</kbd>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Secondary sections — 3 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card onClick={() => navigate("/cars?tab=reserved")} className="border-t-4 border-t-orange-400 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الحجوزات</CardTitle>
            <CalendarCheck className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{reservationsCount}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">حجز نشط</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+C</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/cars?tab=maintenance")} className="border-t-4 border-t-yellow-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{maintenanceCount}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">في الصيانة</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+C</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/alerts")} className="border-t-4 border-t-sky-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الأنشطة المنتهية</CardTitle>
            <CheckCircle className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{summary.totalCompletedRentals}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">تأجير مكتمل</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+A</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/accounts")} className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">الحسابات والمصروفات</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className={`text-2xl font-bold ${(accountsSummary?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {(accountsSummary?.netProfit ?? 0) >= 0 ? "+" : ""}{(accountsSummary?.netProfit ?? 0).toLocaleString('en-US')}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">صافي ربح الشهر</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+E</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/contracts")} className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">العقود</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{contractsCount}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">عقد محفوظ</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+K</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/reports")} className="border-t-4 border-t-teal-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">التقارير الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{summary.totalCompletedRentals}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">تأجير مكتمل</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+P</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/customers")} className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">معلومات الزبائن</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-3xl font-bold">{customersCount}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">ملف عميل محفوظ</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+U</kbd>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/owner-accounts")} className="border-t-4 border-t-orange-500 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">حسابات ملاك السيارات</CardTitle>
            <UserRound className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-orange-600">{ownerDue.toLocaleString('en-US')}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{ownerCarsCount} سيارة خارجية</p>
              <kbd className="text-xs text-muted-foreground border rounded px-1 opacity-60">Alt+O</kbd>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Rentals inline list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            التأجيرات النشطة
            {(activeRentals ?? []).length > 0 && (
              <Badge className="text-xs">{(activeRentals ?? []).length}</Badge>
            )}
          </h3>
          <button
            onClick={() => navigate("/rentals")}
            className="text-xs text-primary hover:underline"
          >
            عرض الكل ←
          </button>
        </div>

        {!activeRentals ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : activeRentals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              لا توجد تأجيرات نشطة حالياً
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeRentals.map(rental => {
              const days = differenceInDays(new Date(), new Date(rental.startedAt));
              const overdue = rental.plannedDays && days > rental.plannedDays;
              return (
                <Card
                  key={rental.id}
                  onClick={() => navigate("/rentals")}
                  className={`cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] border-r-4 ${overdue ? "border-r-destructive" : "border-r-primary"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RentalThumb carId={rental.carId} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">
                              {rental.carModel || "سيارة"}{" "}
                              <span className="text-muted-foreground font-normal text-xs" dir="ltr">{rental.carPlate}</span>
                            </p>
                            {rental.customerName && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="h-3 w-3 shrink-0" />{rental.customerName}
                              </p>
                            )}
                          </div>
                          <Badge variant={overdue ? "destructive" : "secondary"} className="text-xs shrink-0">
                            {days} يوم
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rental.zone === "inside" ? "داخل" : "خارج"} صنعاء
                          </span>
                          {rental.dailyRate && (
                            <span className="font-medium text-foreground">{rental.dailyRate.toLocaleString('en-US')} ر/يوم</span>
                          )}
                          {rental.customerPhone && (
                            <a
                              href={`tel:${rental.customerPhone}`}
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-green-600"
                            >
                              <Phone className="h-3 w-3" />{rental.customerPhone}
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          بدأ: {format(new Date(rental.startedAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts guide */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            اختصارات لوحة المفاتيح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SHORTCUTS.map(s => (
              <div key={s.key} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border text-sm">
                <kbd className="text-xs font-mono bg-background border rounded px-1.5 py-0.5 shrink-0 shadow-sm">{s.key}</kbd>
                <span className="text-muted-foreground text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight">النشاط الأخير</h3>
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {summary.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا يوجد نشاط مؤخراً.</div>
            ) : (
              <ul className="divide-y">
                {summary.recentActivity.map((activity, i) => (
                  <li key={i} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ActivityCarThumb carPlate={activity.carPlate} cars={cars} />
                      <div>
                        <p className="font-medium text-foreground">{activity.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          سيارة <span dir="ltr" className="font-mono">{activity.carPlate}</span>
                          {activity.amount && ` • ${activity.amount.toLocaleString('en-US')} ريال`}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-left leading-tight shrink-0">
                      <div>{format(new Date(activity.timestamp), 'dd/MM/yyyy', { locale: ar })}</div>
                      <div className="mt-0.5 font-mono">{format(new Date(activity.timestamp), 'HH:mm')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
