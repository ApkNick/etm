import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Package, Droplets, Wheat, FileText, Zap, ShieldCheck, Phone, TrendingUp } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { COMMODITY_LABELS, COMMODITY_ICONS, CONTRACT_TYPE_HINT, type Ad, type ContractType, type Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AdDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [ad, setAd] = useState<(Ad & { seller?: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealOpen, setDealOpen] = useState(false);
  const [contractType, setContractType] = useState<ContractType>('sales');
  const [deposit, setDeposit] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ads')
        .select('*, profiles!ads_seller_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();
      if (data) setAd(data as any);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12"><Card className="h-96 animate-pulse bg-muted" /></div>;
  if (!ad) return <div className="px-4 py-12 text-center text-muted-foreground">Оголошення не знайдено</div>;

  const totalAmount = Number(ad.volume_tons) * Number(ad.price_per_ton);
  const isOwner = user?.id === ad.seller_id;


  const handleCreateDeal = async () => {
    if (!user) { navigate({ name: 'auth' }); return; }
    if (profile?.kyc_status !== 'approved') { navigate({ name: 'kyc' }); return; }

    setCreating(true);
    try {
      const depositAmount = deposit ? parseFloat(deposit) : 0;
      const hasDeposit = depositAmount > 0;

      const attachments = [ad.warehouse_cert_path, ad.ttn_lab_path, ad.specifications_path, ad.quality_cert_path]
        .filter(Boolean) as string[];

      const { data, error } = await supabase.from('deals').insert({
        advertisement_id: ad.id,
        buyer_id: user.id,
        seller_id: ad.seller_id,
        contract_type: contractType,
        deposit_amount: depositAmount,
        has_deposit: hasDeposit,
        attachments,
        status: hasDeposit ? 'new' : 'in_progress',
      }).select().single();

      if (error) throw error;
      setDealOpen(false);
      navigate({ name: 'deal-detail', id: data.id });
    } catch (err: any) {
      alert('Помилка: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate({ name: 'marketplace' })}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Назад до ринку
      </button>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: media + details */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="relative h-64 bg-gradient-to-br from-primary/10 to-accent/10">
              {ad.media_paths && ad.media_paths.length > 0 ? (
                <img
                  src={supabase.storage.from('ad-media').getPublicUrl(ad.media_paths[0]).data.publicUrl}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl">{COMMODITY_ICONS[ad.commodity]}</div>
              )}
            </div>
            <div className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary">{COMMODITY_LABELS[ad.commodity]}</Badge>
                <Badge variant="secondary">{ad.delivery_basis}</Badge>
                {ad.region && <Badge variant="outline">{ad.region}</Badge>}
              </div>
              <h1 className="mb-2 text-2xl font-bold">{ad.title}</h1>
              {ad.description && <p className="mb-4 text-muted-foreground">{ad.description}</p>}

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <InfoItem icon={Package} label="Обсяг" value={`${Number(ad.volume_tons).toLocaleString('uk-UA')} т`} />
                <InfoItem icon={TrendingUp} label="Ціна" value={`${Number(ad.price_per_ton).toLocaleString('uk-UA')} грн/т`} />
                <InfoItem icon={Calendar} label="Врожай" value={String(ad.harvest_year)} />
                {ad.moisture != null && <InfoItem icon={Droplets} label="Вологість" value={`${ad.moisture}%`} />}
                {ad.protein != null && <InfoItem icon={Wheat} label="Протеїн" value={`${ad.protein}%`} />}
                {ad.foreign_matter != null && <InfoItem icon={FileText} label="Сміття" value={`${ad.foreign_matter}%`} />}
              </div>
            </div>
          </Card>

          {/* Documents */}
          <Card className="mt-4 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" /> Документи
            </h3>
            <div className="space-y-2">
              <DocItem label="Складське свідоцтво" path={ad.warehouse_cert_path} required bucket="ad-docs" />
              <DocItem label="ТТН та лаб. аналіз" path={ad.ttn_lab_path} bucket="ad-docs" />
              <DocItem label="Специфікації" path={ad.specifications_path} bucket="ad-docs" />
              <DocItem label="Сертифікати якості" path={ad.quality_cert_path} bucket="ad-docs" />
            </div>
          </Card>
        </div>

        {/* Right: seller + deal action */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20 p-5">
            <div className="mb-4 rounded-xl bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Загальна вартість партії</p>
              <p className="text-3xl font-bold text-primary">
                {totalAmount.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн
              </p>
              <p className="text-xs text-muted-foreground">
                {Number(ad.volume_tons).toLocaleString('uk-UA')} т × {Number(ad.price_per_ton).toLocaleString('uk-UA')} грн/т
              </p>
            </div>

            {ad.seller && (
              <div className="mb-4 border-b border-border pb-4">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Продавець</p>
                <p className="font-semibold">{(ad.seller as any).display_name || 'Продавець'}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <ShieldCheck className={cn('h-4 w-4', (ad.seller as any).kyc_status === 'approved' ? 'text-success' : 'text-muted-foreground')} />
                  <span className="text-xs text-muted-foreground">
                    {(ad.seller as any).kyc_status === 'approved' ? 'Верифікований продавець' : 'Не верифікований'}
                  </span>
                </div>
              </div>
            )}

            {isOwner ? (
              <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                Це ваше оголошення
              </div>
            ) : !user ? (
              <Button className="w-full" onClick={() => navigate({ name: 'auth' })}>
                Увійдіть для купівлі
              </Button>
            ) : profile?.kyc_status !== 'approved' ? (
              <div>
                <Button className="w-full" variant="outline" onClick={() => navigate({ name: 'kyc' })}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Пройти верифікацію
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Потрібна KYC-верифікація для укладання угод
                </p>
              </div>
            ) : profile?.role !== 'buyer' ? (
              <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                Тільки покупці можуть ініціювати угоди
              </div>
            ) : (
              <>
                <Button className="w-full" onClick={() => setDealOpen(true)}>
                  <Zap className="mr-2 h-5 w-5" /> Швидка домовленість
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Угода в 1 клік з автоматичним договором
                </p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Або зв''яжіться напряму
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Flash Deal Dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" /> Швидка домовленість
            </DialogTitle>
            <DialogDescription>
              Оберіть тип договору та параметри завдатку. Система автоматично згенерує PDF-договір.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Тип договору</Label>
              <Tabs value={contractType} onValueChange={(v) => setContractType(v as ContractType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sales">Купівлі-продажу</TabsTrigger>
                  <TabsTrigger value="contracting">Контрактації</TabsTrigger>
                  <TabsTrigger value="forward">Форвардний</TabsTrigger>
                </TabsList>
                {(['sales', 'contracting', 'forward'] as ContractType[]).map((t) => (
                  <TabsContent key={t} value={t} className="mt-2">
                    <p className="text-sm text-muted-foreground">{CONTRACT_TYPE_HINT[t]}</p>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="mb-1 font-medium">{COMMODITY_LABELS[ad.commodity]} — {ad.title}</p>
              <p className="text-muted-foreground">
                {Number(ad.volume_tons).toLocaleString('uk-UA')} т × {Number(ad.price_per_ton).toLocaleString('uk-UA')} грн/т =
                <span className="font-semibold text-foreground"> {totalAmount.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposit">Сума завдатку для фіксації угоди (грн)</Label>
              <Input
                id="deposit"
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0 — без завдатку"
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                {deposit && parseFloat(deposit) > 0
                  ? 'Угода буде зафіксована в статусі "Очікує сплати завдатку"'
                  : 'Без завдатку — угода одразу перейде в "В роботі"'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDealOpen(false)}>
                Скасувати
              </Button>
              <Button className="flex-1" onClick={handleCreateDeal} disabled={creating}>
                {creating ? 'Створення...' : 'Створити угоду'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function DocItem({ label, path, required, bucket }: { label: string; path: string | null; required?: boolean; bucket: string }) {
  if (!path) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      <a
        href={supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-primary hover:underline"
      >
        Переглянути
      </a>
    </div>
  );
}
