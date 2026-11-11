import { useState, useEffect, useCallback, useRef } from "react";
import {
  useListRentals, useListCars,
  useListContracts, useCreateContract, useDeleteContract,
  getListContractsQueryKey,
} from "@workspace/api-client-react";
import type { Rental } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebCarPhotos } from "@/hooks/use-car-photos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Camera, Trash2, Plus, MessageCircle, Image as ImageIcon, Car as CarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/date-input";
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { compressAndConvert } from "@/hooks/use-car-photos";

const CONTRACTS_KEY = "@car_rental_contracts";

interface ContractPhoto {
  id: string;
  rentalId: number | null;
  customerName: string;
  carModel: string;
  carPlate: string;
  date: string;
  photos: string[];
  notes: string;
}

type FilterPeriod = "today" | "yesterday" | "week" | "month" | "custom";

const PERIOD_OPTIONS: { key: FilterPeriod; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "custom", label: "تاريخ محدد" },
];

function filterByPeriod(contracts: ContractPhoto[], period: FilterPeriod, from: string, to: string): ContractPhoto[] {
  const now = new Date();
  return contracts.filter(c => {
    const d = new Date(c.date);
    switch (period) {
      case "today": return isToday(d);
      case "yesterday": return isYesterday(d);
      case "week": return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) });
      case "month": return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
      case "custom": {
        if (!from && !to) return true;
        const start = from ? new Date(from) : new Date(0);
        const end = to ? new Date(to) : new Date();
        end.setHours(23, 59, 59, 999);
        return isWithinInterval(d, { start, end });
      }
    }
  });
}

function ContractCarPhoto({ carPlate, cars }: { carPlate: string; cars?: { id: number; plateNumber: string }[] }) {
  const car = (cars ?? []).find(c => c.plateNumber === carPlate);
  const photos = useWebCarPhotos(car?.id ?? 0);
  if (!photos.length) return null;
  return (
    <img src={photos[0]} alt="" className="w-full h-24 object-cover rounded-t-lg"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

export default function ContractsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: apiContracts = [], isLoading } = useListContracts();
  const createContract = useCreateContract();
  const deleteContract = useDeleteContract();
  const { data: rentals } = useListRentals();
  const { data: cars } = useListCars();

  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewContract, setViewContract] = useState<ContractPhoto | null>(null);

  // One-time migration: move localStorage contracts to API
  useEffect(() => {
    const migrated = localStorage.getItem("@contracts_migrated_v1");
    if (migrated) return;
    try {
      const raw = localStorage.getItem(CONTRACTS_KEY);
      if (!raw) { localStorage.setItem("@contracts_migrated_v1", "1"); return; }
      const local: ContractPhoto[] = JSON.parse(raw);
      if (!local.length) { localStorage.setItem("@contracts_migrated_v1", "1"); return; }
      (async () => {
        for (const c of local) {
          await fetch("/api/contracts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c),
          });
        }
        await queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
        localStorage.setItem("@contracts_migrated_v1", "1");
        toast({ title: "تم نقل العقود للسيرفر بنجاح" });
      })();
    } catch { localStorage.setItem("@contracts_migrated_v1", "1"); }
  }, [queryClient, toast]);

  const allContracts: ContractPhoto[] = (apiContracts as ContractPhoto[]).map(c => ({
    ...c,
    date: typeof c.date === "string" ? c.date : new Date(c.date).toISOString(),
  }));

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.key === "n") { e.preventDefault(); setAddOpen(true); }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleShortcut]);

  const [newCustomer, setNewCustomer] = useState("");
  const [newCarModel, setNewCarModel] = useState("");
  const [newCarPlate, setNewCarPlate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [newRentalId, setNewRentalId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  // Auto-fill car model and plate when a car is selected
  useEffect(() => {
    if (selectedCarId && cars) {
      const car = cars.find(c => c.id === selectedCarId);
      if (car) {
        setNewCarModel(car.model);
        setNewCarPlate(car.plateNumber);
      }
    }
  }, [selectedCarId, cars]);

  const filtered = filterByPeriod(allContracts, period, customFrom, customTo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotoLoading(true);
    const results: string[] = [];
    for (const file of files) {
      try { results.push(await compressAndConvert(file)); } catch { /* skip */ }
    }
    setNewPhotos(prev => [...prev, ...results]);
    setPhotoLoading(false);
    setFileKey(k => k + 1);
  }

  function handleSelectRental(rental: Rental) {
    setNewCustomer(rental.customerName || "");
    setNewCarModel(rental.carModel || "");
    setNewCarPlate(rental.carPlate || "");
    setNewRentalId(rental.id);
  }

  async function handleSaveContract() {
    if (!newCustomer && !newCarModel) {
      toast({ title: "خطأ", description: "أدخل اسم العميل أو السيارة", variant: "destructive" });
      return;
    }
    const contract: ContractPhoto = {
      id: Date.now().toString(),
      rentalId: newRentalId,
      customerName: newCustomer,
      carModel: newCarModel,
      carPlate: newCarPlate,
      date: new Date().toISOString(),
      photos: newPhotos,
      notes: newNotes,
    };
    await createContract.mutateAsync({ data: contract });
    await queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
    setNewCustomer(""); setNewCarModel(""); setNewCarPlate(""); setNewNotes(""); setNewPhotos([]); setNewRentalId(null); setSelectedCarId(null);
    setAddOpen(false);
    toast({ title: "تم حفظ العقد" });
  }

  async function handleDelete(id: string) {
    await deleteContract.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
    setViewContract(null);
    toast({ title: "تم الحذف" });
  }

  async function shareWhatsApp(contract: ContractPhoto) {
    const text = `*عقد إيجار*\nالعميل: ${contract.customerName}\nالسيارة: ${contract.carModel} - ${contract.carPlate}\nالتاريخ: ${format(new Date(contract.date), "dd/MM/yyyy", { locale: ar })}\n${contract.notes ? "ملاحظات: " + contract.notes : ""}`;

    // Try Web Share API with the first contract photo (mobile)
    if (contract.photos.length > 0 && typeof navigator !== "undefined" && "share" in navigator) {
      try {
        const base64 = contract.photos[0];
        const res = await fetch(base64);
        const blob = await res.blob();
        const file = new File([blob], "عقد-ايجار.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text });
          return;
        }
      } catch (err) {
        // If the user cancelled the native share dialog, stop — don't open WhatsApp web
        if (err instanceof Error && err.name === "AbortError") return;
        // For other errors (conversion failure, unsupported), fall through to text fallback
      }
    }

    // Fallback: text-only via WhatsApp web
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">العقود</h2>
          <p className="text-muted-foreground mt-1">حفظ ومشاركة عقود الإيجار</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setSelectedCarId(null);
            setNewCustomer(""); setNewCarModel(""); setNewCarPlate("");
            setNewNotes(""); setNewPhotos([]); setNewRentalId(null);
            setFileKey(k => k + 1);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />عقد جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة عقد جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {(rentals ?? []).filter(r => r.status === "active").length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">ربط بتأجير نشط (اختياري)</label>
                  <div className="flex flex-wrap gap-2">
                    {(rentals ?? []).filter(r => r.status === "active").map(r => (
                      <Button key={r.id} size="sm" variant={newRentalId === r.id ? "default" : "outline"} onClick={() => { handleSelectRental(r); setSelectedCarId(null); }}>
                        {r.carModel} — {r.customerName || "غير محدد"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {/* Car selector — auto-fills model and plate */}
              {(cars ?? []).length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                    <CarIcon className="h-3.5 w-3.5" />
                    اختر سيارة (اختياري)
                  </label>
                  <Select
                    value={selectedCarId?.toString() ?? ""}
                    onValueChange={(val) => { setSelectedCarId(val ? Number(val) : null); setNewRentalId(null); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر من قائمة السيارات للتعبئة التلقائية..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(cars ?? []).map(car => (
                        <SelectItem key={car.id} value={car.id.toString()}>
                          {car.model} — {car.plateNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">اسم العميل</label>
                <Input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="اسم المستأجر" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">السيارة</label>
                  <Input value={newCarModel} onChange={e => setNewCarModel(e.target.value)} placeholder="الموديل" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">رقم اللوحة</label>
                  <Input value={newCarPlate} onChange={e => setNewCarPlate(e.target.value)} placeholder="اللوحة" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">ملاحظات</label>
                <Input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="أي تفاصيل إضافية" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">صور العقد والوثائق</label>
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-lg border border-dashed border-primary bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">تصوير أو اختيار من المعرض</span>
                  <input key={fileKey} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
                {photoLoading && <p className="text-xs text-muted-foreground mt-1 animate-pulse">جاري الضغط...</p>}
                {newPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} alt="" className="w-16 h-16 rounded object-cover" />
                        <button onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveContract} disabled={createContract.isPending}>حفظ العقد</Button>
                <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <Button key={opt.key} size="sm" variant={period === opt.key ? "default" : "outline"} onClick={() => setPeriod(opt.key)}>
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

      <p className="text-sm text-muted-foreground">{filtered.length} عقد</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border border-dashed rounded-xl">
          <FileText className="h-10 w-10" />
          <p>لا توجد عقود في هذه الفترة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(contract => (
            <Card key={contract.id} className="overflow-hidden border-t-4 border-t-primary hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewContract(contract)}>
              <ContractCarPhoto carPlate={contract.carPlate} cars={cars} />
              <CardHeader className="pb-2 bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{contract.customerName || "غير محدد"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{contract.carModel} {contract.carPlate && `— ${contract.carPlate}`}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {format(new Date(contract.date), "dd/MM/yyyy", { locale: ar })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{contract.photos.length} صورة</span>
                    {contract.notes && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{contract.notes}</span>}
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => shareWhatsApp(contract)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contract.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewContract && (
        <Dialog open={!!viewContract} onOpenChange={() => setViewContract(null)}>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>عقد — {viewContract.customerName}</span>
                <Button size="sm" variant="outline" className="gap-2 text-green-600 border-green-600" onClick={() => shareWhatsApp(viewContract)}>
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">العميل:</span> <span className="font-medium">{viewContract.customerName}</span></div>
                <div><span className="text-muted-foreground">السيارة:</span> <span className="font-medium">{viewContract.carModel}</span></div>
                <div><span className="text-muted-foreground">اللوحة:</span> <span className="font-medium" dir="ltr">{viewContract.carPlate}</span></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-medium">{format(new Date(viewContract.date), "dd/MM/yyyy HH:mm", { locale: ar })}</span></div>
              </div>
              {viewContract.notes && <p className="text-sm bg-muted/30 p-3 rounded-lg">{viewContract.notes}</p>}
              {viewContract.photos.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">الصور ({viewContract.photos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewContract.photos.map((p, i) => (
                      <img key={i} src={p} alt="" className="rounded-lg object-cover w-full aspect-[4/3]" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد صور مرفقة</p>
              )}
              <Button variant="destructive" className="w-full gap-2" onClick={() => handleDelete(viewContract.id)} disabled={deleteContract.isPending}>
                <Trash2 className="h-4 w-4" />
                حذف العقد
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
