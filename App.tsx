import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { MainLayout } from "@/components/layout";
import { TenantProvider, useTenant } from "@/contexts/tenant-context";
import { NotificationPopup } from "@/components/notification-popup";
import { BlockedScreen } from "@/components/blocked-screen";

import Dashboard from "@/pages/dashboard";
import Cars from "@/pages/cars";
import Rentals from "@/pages/rentals";
import Income from "@/pages/income";
import Debts from "@/pages/debts";
import Accounts from "@/pages/accounts";
import Contracts from "@/pages/contracts";
import Alerts from "@/pages/alerts";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import Customers from "@/pages/customers";
import OwnerAccounts from "@/pages/owner-accounts";
import Assistant from "@/pages/assistant";
import SharedWorkspace from "@/pages/shared-workspace";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function TenantApp({ slug }: { slug: string }) {
  const { tenant, isLoading, isBlocked, notFound, pendingNotifications, dismissNotification } = useTenant();
  const basePath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${slug}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <p className="text-muted-foreground text-lg">جارٍ التحميل...</p>
      </div>
    );
  }

  if (notFound) return <NotFound />;
  if (isBlocked) return <BlockedScreen tenantName={tenant?.name} />;

  return (
    <>
      <WouterRouter base={basePath}>
        <MainLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/assistant" component={Assistant} />
            <Route path="/cars" component={Cars} />
            <Route path="/rentals" component={Rentals} />
            <Route path="/income" component={Income} />
            <Route path="/debts" component={Debts} />
            <Route path="/accounts" component={Accounts} />
            <Route path="/contracts" component={Contracts} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/settings" component={Settings} />
            <Route path="/reports" component={Reports} />
            <Route path="/customers" component={Customers} />
            <Route path="/owner-accounts" component={OwnerAccounts} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </WouterRouter>
      {pendingNotifications.length > 0 && (
        <NotificationPopup
          message={pendingNotifications[0].message}
          onDismiss={() => dismissNotification(pendingNotifications[0].id)}
        />
      )}
    </>
  );
}

function TenantRoute({ params }: { params: { slug: string } }) {
  const slug = params?.slug || "main";
  return (
    <TenantProvider slug={slug}>
      <TenantApp slug={slug} />
    </TenantProvider>
  );
}

function SharedTenantRoute({ params }: { params: { slug: string; token: string } }) {
  return (
    <TenantProvider slug={params.slug}>
      <SharedWorkspace slug={params.slug} token={params.token} />
    </TenantProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/">
              <Redirect to="/main" />
            </Route>
            <Route path="/admin">
              <Redirect to="/main" />
            </Route>
            <Route path="/:slug/shared/:token/*?" component={SharedTenantRoute} />
            <Route path="/:slug/*?" component={TenantRoute} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
