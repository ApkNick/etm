import { useState } from 'react';
import { Menu, X, Sprout, ChevronDown, LogOut, User, LayoutDashboard, ShieldCheck, FileText, Map, Newspaper, LineChart, Store } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { route, navigate } = useRouter();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Ринок', route: { name: 'marketplace' as const }, icon: Store },
    { label: 'Ціни', route: { name: 'prices' as const }, icon: LineChart },
    { label: 'Новини', route: { name: 'news' as const }, icon: Newspaper },
    { label: 'Карта', route: { name: 'map' as const }, icon: Map },
  ];

  const isActive = (name: string) => route.name === name;

  const handleSignOut = async () => {
    await signOut();
    navigate({ name: 'home' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <button
            onClick={() => navigate({ name: 'home' })}
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base font-bold tracking-tight text-foreground">АгроБіржа</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">B2B Marketplace</span>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.route.name)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ name: 'dashboard' })}
                className="hidden sm:flex"
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Кабінет
              </Button>
              {profile?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ name: 'admin' })}
                  className="hidden sm:flex"
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Адмін
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="hidden max-w-[120px] truncate sm:block">
                      {profile?.display_name || user.email}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{profile?.display_name || 'Користувач'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className={cn(
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      profile?.role === 'seller' && 'bg-primary/10 text-primary',
                      profile?.role === 'buyer' && 'bg-info/10 text-info',
                      profile?.role === 'admin' && 'bg-destructive/10 text-destructive',
                    )}>
                      {profile?.role === 'seller' ? 'Продавець' : profile?.role === 'buyer' ? 'Покупець' : 'Адміністратор'}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ name: 'dashboard' })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Кабінет
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ name: 'deals' })}>
                    <FileText className="mr-2 h-4 w-4" /> Мої угоди
                  </DropdownMenuItem>
                  {profile?.kyc_status !== 'approved' && (
                    <DropdownMenuItem onClick={() => navigate({ name: 'kyc' })}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Верифікація KYC
                    </DropdownMenuItem>
                  )}
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate({ name: 'admin' })}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Адмін-панель
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Вийти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ name: 'auth' })}>
              Увійти
            </Button>
          )}

          <button
            className="rounded-lg p-2 hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => { navigate(item.route); setMobileOpen(false); }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive(item.route.name) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            {user && (
              <button
                onClick={() => { navigate({ name: 'dashboard' }); setMobileOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4" /> Кабінет
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
