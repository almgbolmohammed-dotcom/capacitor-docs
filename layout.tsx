import { ReactNode, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Car, LayoutDashboard, Wallet, Receipt, Menu, Timer, AlertCircle, FileText, BarChart3, Settings, TrendingUp, Users, UserRound, Sparkles, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/contexts/tenant-context";

const navigation = [
  { section: "dashboard", name: "الرئيسية",            href: "/",         icon: LayoutDashboard, shortcut: "H" },
  { section: "assistant", name: "المساعد الذكي",       href: "/assistant", icon: Sparkles,        shortcut: "Z", primary: true },
  { section: "cars", name: "السيارات",                 href: "/cars",      icon: Car,             shortcut: "C" },
  { section: "rentals", name: "التأجيرات النشطة",      href: "/rentals",   icon: Timer,           shortcut: "R" },
  { section: "alerts", name: "الأنشطة المنتهية",       href: "/alerts",    icon: AlertCircle,     shortcut: "A" },
  { section: "contracts", name: "العقود",              href: "/contracts", icon: FileText,        shortcut: "K" },
  { section: "customers", name: "معلومات الزبائن",     href: "/customers", icon: Users,           shortcut: "U" },
  { section: "ownerAccounts", name: "حسابات الملاك",    href: "/owner-accounts", icon: UserRound,   shortcut: "O" },
  { section: "accounts", name: "الحسابات والمصروفات",  href: "/accounts",  icon: BarChart3,       shortcut: "E" },
  { section: "income", name: "الدخل",                  href: "/income",    icon: Wallet,          shortcut: "I" },
  { section: "debts", name: "المديونية",               href: "/debts",     icon: Receipt,         shortcut: "D" },
  { section: "reports", name: "التقارير",              href: "/reports",   icon: TrendingUp,      shortcut: "P" },
  { section: "settings", name: "الإعدادات",            href: "/settings",  icon: Settings,        shortcut: "S" },
];

export function MainLayout({
  children,
  allowedSections,
  sharedMode = false,
}: {
  children: ReactNode;
  allowedSections?: string[];
  sharedMode?: boolean;
}) {
  const [location, navigate] = useLocation();
  const { tenant } = useTenant();
  const visibleNavigation = useMemo(() => {
    const allowedNavigation = allowedSections
      ? navigation.filter((item) => {
          if (item.section === "cars") {
            return allowedSections.includes("cars") || allowedSections.includes("maintenance");
          }
          if (item.section === "alerts") {
            return allowedSections.includes("alerts") || allowedSections.includes("completed");
          }
          return allowedSections.includes(item.section);
        })
      : navigation;

    if (!sharedMode) return allowedNavigation;
    return [
      { section: "sharedHome", name: "الأقسام المتاحة", href: "/", icon: LayoutDashboard, shortcut: "H" },
      ...(allowedSections?.includes("tasks")
        ? [{ section: "tasks", name: "مهام الفريق", href: "/tasks", icon: ListChecks, shortcut: "M" }]
        : []),
      ...allowedNavigation.filter((item) => item.section !== "dashboard"),
    ];
  }, [allowedSections, sharedMode]);

  const appName = tenant?.name ?? "نظام التأجير";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toUpperCase();
      const match = visibleNavigation.find((item) => item.shortcut === key);
      if (match) {
        e.preventDefault();
        navigate(match.href);
      }
    },
    [navigate, visibleNavigation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
       {visibleNavigation.map((item) => {
        const isActive =
          item.href === "/"
            ? location === "/" || location === ""
            : location === item.href || location.startsWith(item.href + "/");
        return (
          <Tooltip key={item.name} delayDuration={400}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? item.primary
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-secondary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </span>
                <Kbd className="text-[10px] opacity-50 shrink-0 hidden md:inline-flex">
                  Alt+{item.shortcut}
                </Kbd>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              اختصار: Alt+{item.shortcut}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );

  return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row rtl text-right">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary tracking-tight">{appName}</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-4 rtl">
            <h2 className="text-xl font-bold text-primary mb-1 mt-4">القائمة</h2>
            <p className="text-xs text-muted-foreground mb-4">Alt+حرف للتنقل السريع</p>
            <nav className="flex flex-col gap-2">
              <NavLinks />
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-l sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 pb-3">
          <h1 className="text-2xl font-bold text-primary tracking-tight">{appName}</h1>
          <p className="text-xs text-muted-foreground mt-1">Alt+حرف للتنقل السريع</p>
        </div>
        <nav className="flex-1 px-4 pb-4 flex flex-col gap-1">
          <NavLinks />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {!sharedMode && (
          <div className="flex items-center justify-center gap-2 mb-5">
            <Link
              href="/assistant"
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold shadow-sm transition-all ${
                location === "/assistant"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-primary border-primary/30 hover:bg-primary/5"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              المساعد الذكي
            </Link>
            <Link
              href="/settings"
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                location.startsWith("/settings")
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              <Settings className="h-4 w-4" />
              الإعدادات
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
