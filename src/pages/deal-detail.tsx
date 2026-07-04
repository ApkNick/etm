import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, FileText, Download, Upload, CheckCircle2, Circle, Clock, Wallet, FileSignature, PenLine, Info } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, BUCKETS } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { COMMODITY_SHORT, COMMODITY_LABELS, CONTRACT_TYPE_LABELS, type Deal, type Ad, type Profile, type KycRecord, type DealStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DealDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [buyerKyc, setBuyerKyc] = useState<KycRecord | null>(null);
  const [sellerKyc, setSellerKyc] = useState<KycRecord | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: dealData } = await supabase.from('deals').select('*').eq('id', id).maybeSingle();
      if (!dealData) { setLoading(false); return; }
      const d = dealData as Deal;
      setDeal(d);

      const { data: adData } = await supabase.from('ads').select('*').eq('id', d.advertisement_id).maybeSingle();
      if (adData) setAd(adData as Ad);

      const [buyerRes, sellerRes, buyerKycRes, sellerKycRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', d.buyer_id).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', d.seller_id).maybeSingle(),
        supabase.from('kyc_records').select('*').eq('user_id', d.buyer_id).maybeSingle(),
        supabase.from('kyc_records').select('*').eq('user_id', d.seller_id).maybeSingle(),
      ]);
      setBuyerProfile(buyerRes.data as Profile | null);
      setSellerProfile(sellerRes.data as Profile | null);
      setBuyerKyc(buyerKycRes.data as KycRecord | null);
      setSellerKyc(sellerKycRes.data as KycRecord | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12"><Card className="h-96 animate-pulse bg-muted" /></div>;
  if (!deal) return <div className="px-4 py-12 text-center text-muted-foreground">Угоду не знайдено</div>;

  const isBuyer = user?.id === deal.buyer_id;
  const isSeller = user?.id === deal.seller_id;
  const totalAmount = ad ? Number(ad.volume_tons) * Number(ad.price_per_ton) : 0;
  const remaining = totalAmount - deal.deposit_amount;

  const generateContract = () => {
    if (!ad || !buyerKyc || !sellerKyc) return '';
    const template = `ДОГОВІР ${CONTRACT_TYPE_LABELS[deal.contract_type]}

Дата: ${new Date().toLocaleDateString('uk-UA')}

ПРОДАВЕЦЬ: ${sellerKyc.legal_name}
ЄДРПОУ: ${sellerKyc.usreou}
IBAN: ${sellerKyc.iban}
Банк: ${sellerKyc.bank_name}

ПОКУПЕЦЬ: ${buyerKyc.legal_name}
ЄДРПОУ: ${buyerKyc.usreou}
IBAN: ${buyerKyc.iban}
Банк: ${buyerKyc.bank_name}

ПРЕДМЕТ ДОГОВОРУ:
Культура: ${COMMODITY_LABELS[ad.commodity]}
Обсяг: ${ad.volume_tons} тонн
Ціна за тонну: ${ad.price_per_ton} грн
Загальна вартість: ${totalAmount.toLocaleString('uk-UA')} грн
Базис поставки: ${ad.delivery_basis}
Рік врожаю: ${ad.harvest_year}
Вологість: ${ad.moisture ?? '—'}%
Протеїн: ${ad.protein ?? '—'}%
Сміття: ${ad.foreign_matter ?? '—'}%

ЗАВДАТОК: ${deal.has_deposit ? deal.deposit_amount.toLocaleString('uk-UA') + ' грн' : 'Без завдатку'}

ДОДАТКИ:
Додаток №1: Складське свідоцтво
Додаток №2: Лабораторний аналіз / ТТН

Підписи:
Продавець: _________________  Покупець: _________________
`;
    return template;
  };

  const handleDownloadContract = () => {
    const text = generateContract();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Договір_${deal.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadSigned = async () => {
    if (!signedFile || !user) return;
    setActionLoading(true);
    try {
      const ext = signedFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_signed.${ext}`;
      const { error } = await supabase.storage.from(BUCKETS.dealDocs).upload(path, signedFile);
      if (error) throw error;

      const updates: any = {};
      if (isBuyer) {
        updates.buyer_signed_external = true;
        updates.buyer_signed_path = path;
      } else {
        updates.seller_signed_external = true;
        updates.seller_signed_path = path;
      }

      await supabase.from('deals').update(updates).eq('id', deal.id);
      setSignedFile(null);
      window.location.reload();
    } catch (err: any) {
      alert('Помилка: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayDeposit = async () => {
    setActionLoading(true);
    try {
      const updates: any = { deposit_paid: true };
      if (deal.status === 'new') updates.status = 'in_progress';
      await supabase.from('deals').update(updates).eq('id', deal.id);
      window.location.reload();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFinal = async () => {
    setActionLoading(true);
    try {
      await supabase.from('deals').update({ final_paid: true, status: 'completed' }).eq('id', deal.id);
      window.location.reload();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhysicalSign = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const updates: any = {};
      if (isBuyer) updates.buyer_signed_physical = true;
      else updates.seller_signed_physical = true;
      await supabase.from('deals').update(updates).eq('id', deal.id);
      window.location.reload();
    } finally {
      setActionLoading(false);
    }
  };

  const steps: { status: DealStatus; label: string; icon: any }[] = [
    { status: 'new', label: 'Очікує сплати завдатку', icon: Wallet },
    { status: 'in_progress', label: 'В роботі', icon: Clock },
    { status: 'completed', label: 'Завершена', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === deal.status);
  const showDepositStep = deal.has_deposit;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate({ name: 'deals' })} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Мої угоди
      </button>

      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold">Швидка домовленість</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{CONTRACT_TYPE_LABELS[deal.contract_type]}</p>
      </div>

      {/* Status stepper */}
      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between">
          {(showDepositStep ? steps : steps.slice(1)).map((step, i) => {
            const actualIndex = showDepositStep ? i : i + 1;
            const isDone = actualIndex < currentStepIndex || (actualIndex === currentStepIndex && deal.status === 'completed');
            const isCurrent = actualIndex === currentStepIndex;
            return (
              <div key={step.status} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    isDone ? 'border-success bg-success text-success-foreground' :
                    isCurrent ? 'border-primary bg-primary text-primary-foreground' :
                    'border-border bg-muted text-muted-foreground'
                  )}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                  </div>
                  <p className={cn('mt-1.5 max-w-[100px] text-center text-xs font-medium', isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                </div>
                {i < (showDepositStep ? 2 : 1) && (
                  <div className={cn('mx-2 h-0.5 flex-1 rounded', actualIndex < currentStepIndex ? 'bg-success' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Deal summary */}
      {ad && (
        <Card className="mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Продукція</p>
              <p className="font-semibold">{COMMODITY_SHORT[ad.commodity]} — {ad.title}</p>
              <p className="text-sm text-muted-foreground">{Number(ad.volume_tons).toLocaleString('uk-UA')} т × {Number(ad.price_per_ton).toLocaleString('uk-UA')} грн/т</p>
            </div>
            <div className="sm:text-right">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Загальна сума</p>
              <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн</p>
              {deal.has_deposit && (
                <p className="text-sm text-muted-foreground">Завдаток: {deal.deposit_amount.toLocaleString('uk-UA')} грн</p>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Продавець</p>
              <p className="text-sm font-medium">{sellerProfile?.display_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{sellerKyc?.legal_name || 'KYC не подано'}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase text-muted-foreground">Покупець</p>
              <p className="text-sm font-medium">{buyerProfile?.display_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{buyerKyc?.legal_name || 'KYC не подано'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment section */}
      {isBuyer && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-primary" /> Оплата
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground"><Info className="h-3.5 w-3.5" /></button>
                </TooltipTrigger>
                <TooltipContent><p className="max-w-[240px] text-xs">Демо-режим: оплата симулюється натисканням кнопки. В реальній системі тут буде платіжний шлюз.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>

          {deal.has_deposit && !deal.deposit_paid && (
            <div className="mb-4 rounded-lg bg-warning/10 p-4">
              <p className="mb-2 text-sm font-medium">Сплатіть завдаток для фіксації угоди</p>
              <p className="mb-3 text-2xl font-bold text-warning">{deal.deposit_amount.toLocaleString('uk-UA')} грн</p>
              <Button onClick={handlePayDeposit} disabled={actionLoading}>
                <Wallet className="mr-2 h-4 w-4" /> Сплатити завдаток
              </Button>
            </div>
          )}

          {(!deal.has_deposit || deal.deposit_paid) && !deal.final_paid && (
            <div className="rounded-lg bg-info/10 p-4">
              <p className="mb-2 text-sm font-medium">Сплатіть залишок за договором</p>
              <p className="mb-3 text-2xl font-bold text-info">{remaining.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн</p>
              <Button onClick={handlePayFinal} disabled={actionLoading}>
                <Wallet className="mr-2 h-4 w-4" /> Сплатити залишок
              </Button>
            </div>
          )}

          {deal.final_paid && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-4 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Оплата отримана повністю</span>
            </div>
          )}
        </Card>
      )}

      {/* Contract + Signing */}
      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5 text-primary" /> Договір та підписання
        </h3>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadContract}>
            <Download className="mr-2 h-4 w-4" /> Завантажити договір
          </Button>
          {deal.attachments && deal.attachments.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" /> Додатки: {deal.attachments.length} файл(ів)
            </div>
          )}
        </div>

        <Tabs defaultValue="external">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="external" className="text-xs sm:text-sm">Зовн. підпис (Дія/Vchasno)</TabsTrigger>
            <TabsTrigger value="native" className="text-xs sm:text-sm">Платформне підписання</TabsTrigger>
            <TabsTrigger value="physical" className="text-xs sm:text-sm">Фізичне підписання</TabsTrigger>
          </TabsList>

          {/* External signing */}
          <TabsContent value="external" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                1. Завантажте PDF-договір<br />
                2. Перейдіть на Дія.Підпис або Vchasno для підписання<br />
                3. Завантажте підписаний файл назад
              </p>
              <div className="mb-3 flex gap-2">
                <a href="https://diia.gov.ua" target="_blank" rel="noreferrer" className="text-sm text-info hover:underline">
                  Відкрити Дія.Підпис →
                </a>
              </div>

              {/* Traffic light status */}
              <div className="mb-3 flex gap-3">
                <SignStatus label="Продавець" signed={deal.seller_signed_external} isYou={isSeller} />
                <SignStatus label="Покупець" signed={deal.buyer_signed_external} isYou={isBuyer} />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 hover:border-primary/40">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {signedFile ? signedFile.name : 'Завантажити підписаний файл'}
                  </span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setSignedFile(e.target.files?.[0] ?? null)} />
                </label>
                <Button onClick={handleUploadSigned} disabled={!signedFile || actionLoading} size="sm">
                  Підтвердити
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Native signing */}
          <TabsContent value="native" className="mt-4">
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <FileSignature className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Внутрішнє електронне підписання</p>
              <Badge variant="secondary" className="mt-2">Незабаром</Badge>
              <p className="mt-2 text-sm text-muted-foreground">Функція в розробці</p>
            </div>
          </TabsContent>

          {/* Physical signing */}
          <TabsContent value="physical" className="mt-4">
            <div className="rounded-lg border border-border p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                1. Завантажте та роздрукуйте 2 примірники договору<br />
                2. Підпишіть обидва примірники вручну<br />
                3. Відмітьте підписання нижче
              </p>
              <div className="mb-3 flex gap-3">
                <PhysicalStatus
                  label="Продавець"
                  signed={deal.seller_signed_physical}
                  isYou={isSeller}
                  onSign={handlePhysicalSign}
                  loading={actionLoading}
                />
                <PhysicalStatus
                  label="Покупець"
                  signed={deal.buyer_signed_physical}
                  isYou={isBuyer}
                  onSign={handlePhysicalSign}
                  loading={actionLoading}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function SignStatus({ label, signed, isYou }: { label: string; signed: boolean; isYou: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        signed ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {signed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </div>
      <div>
        <p className="text-xs font-medium">{label} {isYou && '(Ви)'}</p>
        <p className={cn('text-xs', signed ? 'text-success' : 'text-muted-foreground')}>
          {signed ? 'Підписано' : 'Очікує підписання'}
        </p>
      </div>
    </div>
  );
}

function PhysicalStatus({ label, signed, isYou, onSign, loading }: { label: string; signed: boolean; isYou: boolean; onSign: () => void; loading: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <div className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full',
        signed ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {signed ? <CheckCircle2 className="h-4 w-4" /> : <PenLine className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium">{label} {isYou && '(Ви)'}</p>
        <p className={cn('text-xs', signed ? 'text-success' : 'text-muted-foreground')}>
          {signed ? 'Підписано' : 'Не підписано'}
        </p>
      </div>
      {isYou && !signed && (
        <Button size="sm" variant="outline" onClick={onSign} disabled={loading}>
          Підписати
        </Button>
      )}
    </div>
  );
}
