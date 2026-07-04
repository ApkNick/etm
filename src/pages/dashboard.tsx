import { useEffect, useState } from 'react';
import { LayoutDashboard, Store, FileText, Zap, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { COMMODITY_SHORT, COMMODITY_LABELS, DEAL_STATUS_LABELS, type Ad, type Deal } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [deals, setDeals] = useState<(Deal & { ad?: Ad })[]>([]);

  useEffect(() => {
    if (!user) { navigate({ name: 'auth' }); return; }
    (async () => {
      const { data: adsData } = await supabase
        .from('ads')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (adsData) setAds(adsData as Ad[]);

      const { data: dealsData } = await supabase
        .from('deals')
        .select('*, ads(*)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (dealsData) setDeals(dealsData as any);
    })();
  }, [user]);

  if (!user) return null;

  const statusColors: Record<string, string> = {
    new: 'bg-warning/15 text-warning border-warning/30',
    in_progress: 'bg-info/15 text-info border-info/30',
    completed: 'bg-success/15 text-success border-success/30',
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Кабінет користувача</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Вітаємо, {profile?.display_name || user.email}</p>
      </div>

      {/* KYC alert */}
      {profile && profile.kyc_status !== 'approved' && (
        <Card className={cn(
          'mb-5 flex items-center justify-between p-4',
          profile.kyc_status === 'pending' ? 'border-warning/30 bg-warning/5' : 'border-destructive/30 bg-destructive/5'
        )}>
          <div className="flex items-center gap-3">
            <AlertCircle className={cn('h-5 w-5', profile.kyc_status === 'pending' ? 'text-warning' : 'text-destructive')} />
            <div>
              <p className="text-sm font-medium">
                {profile.kyc_status === 'pending' ? 'Верифікація KYC на розгляді' : 'Верифікація KYC не пройдена'}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.kyc_status === 'pending' ? 'Доступ до ринку буде відкрито після перевірки' : 'Пройдіть верифікацію для доступу до торгівлі'}
              </p>
            </div>
          </div>
          {profile.kyc_status !== 'pending' && (
            <Button size="sm" variant="outline" onClick={() => navigate({ name: 'kyc' })}>
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Пройти верифікацію
            </Button>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ads.length}</p>
              <p className="text-xs text-muted-foreground">Мої оголошення</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deals.length}</p>
              <p className="text-xs text-muted-foreground">Мої угоди</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              profile?.kyc_status === 'approved' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            )}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {profile?.kyc_status === 'approved' ? 'Верифіковано' : profile?.kyc_status === 'pending' ? 'Очікує' : 'Не верифіковано'}
              </p>
              <p className="text-xs text-muted-foreground">Статус KYC</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My ads */}
      {profile?.role === 'seller' && (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Store className="h-5 w-5 text-primary" /> Мої оголошення
            </h3>
            <Button size="sm" onClick={() => navigate({ name: 'create-ad' })}>
              <Plus className="mr-1 h-4 w-4" /> Додати
            </Button>
          </div>
          {ads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              У вас ще немає оголошень. Створіть перше!
            </p>
          ) : (
            <div className="space-y-2">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30"
                  onClick={() => navigate({ name: 'ad-detail', id: ad.id })}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ad.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {COMMODITY_SHORT[ad.commodity]} • {Number(ad.volume_tons).toLocaleString('uk-UA')} т • {Number(ad.price_per_ton).toLocaleString('uk-UA')} грн/т
                    </p>
                  </div>
                  <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>{ad.status === 'active' ? 'Активне' : 'Закрите'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* My deals */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5 text-primary" /> Мої угоди
          </h3>
          <Button size="sm" variant="outline" onClick={() => navigate({ name: 'deals' })}>
            Всі угоди
          </Button>
        </div>
        {deals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            У вас ще немає угод. Перейдіть на ринок, щоб знайти пропозицію.
          </p>
        ) : (
          <div className="space-y-2">
            {deals.slice(0, 5).map(deal => (
              <div
                key={deal.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30"
                onClick={() => navigate({ name: 'deal-detail', id: deal.id })}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {deal.ad ? COMMODITY_SHORT[deal.ad.commodity] : 'Угода'} — {deal.ad?.title || ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(deal.created_at).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <Badge className={cn('border', statusColors[deal.status])}>
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function DealsPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [deals, setDeals] = useState<(Deal & { ad?: Ad })[]>([]);

  useEffect(() => {
    if (!user) { navigate({ name: 'auth' }); return; }
    (async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, ads(*)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (data) setDeals(data as any);
    })();
  }, [user]);

  if (!user) return null;

  const statusColors: Record<string, string> = {
    new: 'bg-warning/15 text-warning border-warning/30',
    in_progress: 'bg-info/15 text-info border-info/30',
    completed: 'bg-success/15 text-success border-success/30',
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Мої угоди</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Поточні та завершені транзакції</p>
      </div>

      {deals.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">Угод поки що немає</p>
          <p className="text-sm text-muted-foreground">Знайдіть пропозицію на ринку та ініціюйте швидку домовленість</p>
          <Button className="mt-4" onClick={() => navigate({ name: 'marketplace' })}>
            <Store className="mr-2 h-4 w-4" /> Перейти на ринок
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => {
            const isBuyer = user.id === deal.buyer_id;
            const total = deal.ad ? Number(deal.ad.volume_tons) * Number(deal.ad.price_per_ton) : 0;
            return (
              <Card
                key={deal.id}
                className="cursor-pointer p-4 transition-all hover:shadow-md"
                onClick={() => navigate({ name: 'deal-detail', id: deal.id })}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold">{deal.ad ? COMMODITY_LABELS[deal.ad.commodity] : 'Угода'}</span>
                      <Badge variant="outline" className="text-[10px]">{isBuyer ? 'Ви — покупець' : 'Ви — продавець'}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{deal.ad?.title || ''}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {total.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн • {new Date(deal.created_at).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn('border', statusColors[deal.status])}>
                      {DEAL_STATUS_LABELS[deal.status]}
                    </Badge>
                    {deal.has_deposit && !deal.deposit_paid && isBuyer && (
                      <span className="text-xs text-warning">Сплатити завдаток</span>
                    )}
                    {deal.deposit_paid && !deal.final_paid && isBuyer && (
                      <span className="text-xs text-info">Сплатити залишок</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
