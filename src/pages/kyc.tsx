import { useState, useEffect } from 'react';
import { ShieldCheck, Upload, FileCheck2, AlertCircle, Building2, User as UserIcon, Info } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, BUCKETS } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { KycRecord } from '@/lib/types';

export function KycPage() {
  const { navigate } = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [companyType, setCompanyType] = useState<'legal' | 'entrepreneur'>('legal');
  const [legalName, setLegalName] = useState('');
  const [usreou, setUsreou] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<KycRecord | null>(null);

  useEffect(() => {
    if (!user) { navigate({ name: 'auth' }); return; }
    (async () => {
      const { data } = await supabase
        .from('kyc_records')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setExisting(data as KycRecord);
        setCompanyType(data.company_type || 'legal');
        setLegalName(data.legal_name);
        setUsreou(data.usreou);
        setBankName(data.bank_name);
        setIban(data.iban);
      }
    })();
  }, [user]);

  if (!user) return null;

  const usreouValid = /^[0-9]{8}$|^[0-9]{10}$/.test(usreou);
  const ibanValid = /^UA[0-9]{27}$/.test(iban);

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!usreouValid) { setError('ЄДРПОУ має містити 8 або 10 цифр'); return; }
    if (!ibanValid) { setError('IBAN має починатися з UA та містити 27 цифр'); return; }
    if (!registerFile && !existing?.register_extract_path) {
      setError("Витяг з державного реєстру обов'язковий");
      return;
    }
    if (!taxFile && !existing?.tax_certificate_path) {
      setError("Податковий сертифікат обов'язковий");
      return;
    }

    setLoading(true);
    try {
      let registerPath = existing?.register_extract_path;
      let taxPath = existing?.tax_certificate_path;

      if (registerFile) registerPath = await uploadFile(registerFile, BUCKETS.kyc, user.id);
      if (taxFile) taxPath = await uploadFile(taxFile, BUCKETS.kyc, user.id);

      const payload = {
        user_id: user.id,
        company_type: companyType,
        legal_name: legalName,
        usreou,
        bank_name: bankName,
        iban,
        register_extract_path: registerPath,
        tax_certificate_path: taxPath,
      };

      if (existing) {
        await supabase.from('kyc_records').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('kyc_records').insert(payload);
      }

      await supabase.from('profiles').update({
        kyc_status: 'pending',
        kyc_submitted_at: new Date().toISOString(),
      }).eq('id', user.id);

      await refreshProfile();
      navigate({ name: 'dashboard' });
    } catch (err: any) {
      setError(err.message || 'Помилка збереження');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = () => {
    switch (profile?.kyc_status) {
      case 'pending': return { text: 'На розгляді', cls: 'bg-warning/15 text-warning' };
      case 'approved': return { text: 'Верифіковано', cls: 'bg-success/15 text-success' };
      case 'rejected': return { text: 'Відхилено', cls: 'bg-destructive/15 text-destructive' };
      default: return { text: 'Не подано', cls: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Верифікація KYC / KYB</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Корпоративне онбординг для доступу до торгової площадки.
          Дані та файли шифруються та доступні лише вам та адміністратору платформи.
        </p>
        {profile && (
          <span className={cn('mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold', statusBadge().cls)}>
            Статус: {statusBadge().text}
          </span>
        )}
      </div>

      {profile?.kyc_status === 'rejected' && (
        <Card className="mb-5 border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Верифікацію відхилено</p>
              <p className="mt-0.5 text-destructive/80">{existing?.admin_notes || 'Перевірте дані та подайте повторно.'}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="mb-2 block">Тип контрагента</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCompanyType('legal')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all',
                  companyType === 'legal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <Building2 className="h-5 w-5" />
                Юридична особа
              </button>
              <button
                type="button"
                onClick={() => setCompanyType('entrepreneur')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all',
                  companyType === 'entrepreneur' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <UserIcon className="h-5 w-5" />
                ФОП
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="legalName">
              {companyType === 'legal' ? 'Юридична назва компанії' : 'ПІБ приватного підприємця'}
            </Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder={companyType === 'legal' ? 'ТОВ АгроХолдинг' : 'ФОП Іваненко Іван Іванович'}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usreou">ЄДРПОУ / Tax ID</Label>
              <Input
                id="usreou"
                value={usreou}
                onChange={(e) => setUsreou(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="8 або 10 цифр"
                className={usreou && !usreouValid ? 'border-destructive' : ''}
                required
              />
              {usreou && !usreouValid && (
                <p className="text-xs text-destructive">Має бути 8 або 10 цифр</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Назва банку</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="ПриватБанк / Ощадбанк"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="iban">Корпоративний IBAN</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 29))}
              placeholder="UA + 27 цифр"
              className={iban && !ibanValid ? 'border-destructive' : ''}
              required
            />
            {iban && !ibanValid && (
              <p className="text-xs text-destructive">Формат: UA + 27 цифр</p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <FileUpload
              label="Витяг з державного реєстру"
              required
              file={registerFile}
              existingPath={existing?.register_extract_path}
              onChange={setRegisterFile}
            />
            <FileUpload
              label="Податковий / ПДВ сертифікат"
              required
              file={taxFile}
              existingPath={existing?.tax_certificate_path}
              onChange={setTaxFile}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || profile?.kyc_status === 'pending'}>
            {loading ? 'Збереження...' : profile?.kyc_status === 'pending' ? 'Очікує перевірки' : 'Подати на верифікацію'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function FileUpload({
  label, required, file, existingPath, onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  existingPath?: string | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">PDF або зображення. Файл шифрується та доступний лише адміністратору.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          file || existingPath ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
        )}>
          {file || existingPath ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          {file ? (
            <p className="truncate text-sm font-medium">{file.name}</p>
          ) : existingPath ? (
            <p className="truncate text-sm font-medium text-success">Завантажено: {existingPath.split('/').pop()}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Натисніть для вибору файлу (PDF / зображення)</p>
          )}
        </div>
        <input
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
