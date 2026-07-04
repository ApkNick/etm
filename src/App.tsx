import { Sprout } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import { Navbar } from '@/components/navbar';
import { HomePage } from '@/pages/home';
import { AuthPage } from '@/pages/auth';
import { KycPage } from '@/pages/kyc';
import { MarketplacePage } from '@/pages/marketplace';
import { AdDetailPage } from '@/pages/ad-detail';
import { CreateAdPage } from '@/pages/create-ad';
import { PricesPage } from '@/pages/prices';
import { NewsPage, NewsDetailPage } from '@/pages/news';
import { MapPage } from '@/pages/map';
import { DashboardPage, DealsPage } from '@/pages/dashboard';
import { DealDetailPage } from '@/pages/deal-detail';
import { AdminPage } from '@/pages/admin';

function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sprout className="h-4 w-4" />
              </div>
              <span className="font-bold">АгроБіржа</span>
            </div>
            <p className="text-sm text-muted-foreground">
              B2B торговельна площадка та аналітичний портал для агробізнесу України.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Платформа</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate({ name: 'marketplace' })} className="hover:text-foreground">Ринок</button></li>
              <li><button onClick={() => navigate({ name: 'prices' })} className="hover:text-foreground">Ціни</button></li>
              <li><button onClick={() => navigate({ name: 'news' })} className="hover:text-foreground">Новини</button></li>
              <li><button onClick={() => navigate({ name: 'map' })} className="hover:text-foreground">Карта</button></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Для бізнесу</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate({ name: 'auth' })} className="hover:text-foreground">Реєстрація</button></li>
              <li><button onClick={() => navigate({ name: 'kyc' })} className="hover:text-foreground">Верифікація KYC</button></li>
              <li><button onClick={() => navigate({ name: 'create-ad' })} className="hover:text-foreground">Подати оголошення</button></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Контакти</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>info@agrobirja.ua</li>
              <li>+380 44 123 45 67</li>
              <li>Київ, Україна</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2025 АгроБіржа. Всі права захищені.
        </div>
      </div>
    </footer>
  );
}

function Routes() {
  const { route } = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Guard authenticated routes
  const needsAuth = ['dashboard', 'deals', 'deal-detail', 'kyc', 'create-ad', 'admin'].includes(route.name);
  if (needsAuth && !user) {
    return <AuthPage />;
  }

  switch (route.name) {
    case 'home': return <HomePage />;
    case 'auth': return <AuthPage />;
    case 'kyc': return <KycPage />;
    case 'prices': return <PricesPage />;
    case 'news': return <NewsPage />;
    case 'news-detail': return <NewsDetailPage id={route.id} />;
    case 'map': return <MapPage />;
    case 'marketplace': return <MarketplacePage />;
    case 'ad-detail': return <AdDetailPage id={route.id} />;
    case 'create-ad': return <CreateAdPage />;
    case 'dashboard': return <DashboardPage />;
    case 'deals': return <DealsPage />;
    case 'deal-detail': return <DealDetailPage id={route.id} />;
    case 'admin': return <AdminPage />;
    default: return <HomePage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes />
          </main>
          <Footer />
        </div>
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
