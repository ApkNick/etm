import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileCheck2, ImagePlus, Info, AlertCircle, Save } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase, BUCKETS } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { COMMODITY_LABELS, type Commodity, type DeliveryBasis } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CreateAdPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [commodity, setCommodity] = useState<Commodity>('grain');
  const [volume, setVolume] = useState('');
  const [price, setPrice] = useState('');
  const [basis, setBasis] = useState<DeliveryBasis>('EXW');
  const [harvestYear, setHarvestYear] = useState(new Date().getFullYear());
  const [moisture, setMoisture] = useState('');
  const [protein, setProtein] = useState('');
  const [foreignMatter, setForeignMatter] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [warehouseCert, setWarehouseCert] = useState<File | null>(null);
  const [ttnLab, setTtnLab] = useState<File | null>(null);
  const [specifications, setSpecifications] = useState<File | null>(null);
  const [qualityCert, setQualityCert] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    navigate({ name: 'auth' });
    return null;
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setMediaFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    setMediaFiles(prev => [...prev, ...files]);
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Вкажіть назву'); return; }
    if (!volume || parseFloat(volume) <= 0) { setError('Вкажіть обсяг'); return; }
    if (!price || parseFloat(price) < 0) { setError('Вкажіть ціну'); return; }
    if (!warehouseCert) { setError("Складське свідоцтво обов'язкове для публікації"); return; }

    setLoading(true);
    try {
      const mediaPaths: string[] = [];
      for (const f of mediaFiles) {
        const p = await uploadFile(f, BUCKETS.adMedia, user.id);
        mediaPaths.push(p);
      }
      const warehousePath = await uploadFile(warehouseCert, BUCKETS.adDocs, user.id);
      const ttnPath = ttnLab ? await uploadFile(ttnLab, BUCKETS.adDocs, user.id) : null;
      const specPath = specifications ? await uploadFile(specifications, BUCKETS.adDocs, user.id) : null;
      const qualPath = qualityCert ? await uploadFile(qualityCert, BUCKETS.adDocs, user.id) : null;

      const { error: insertError } = await supabase.from('ads').insert({
        seller_id: user.id,
        title,
        commodity,
        volume_tons: parseFloat(volume),
        price_per_ton: parseFloat(price),
        delivery_basis: basis,
        harvest_year: harvestYear,
        moisture: moisture ? parseFloat(moisture) : null,
        protein: protein ? parseFloat(protein) : null,
        foreign_matter: foreignMatter ? parseFloat(foreignMatter) : null,
        region: region || null,
        description: description || null,
        media_paths: mediaPaths,
        warehouse_cert_path: warehousePath,
        ttn_lab_path: ttnPath,
        specifications_path: specPath,
        quality_cert_path: qualPath,
        status: 'active',
      });

      if (insertError) throw insertError;
      navigate({ name: 'marketplace' });
    } catch (err: any) {
      setError(err.message || 'Помилка створення');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold">Нове оголошення</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Заповніть параметри партії. Складське свідоцтво обов'язкове для публікації.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Основна інформація</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Назва оголошення</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Пшениця м''яка 3 клас, врожай 2025" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="commodity">Культура</Label>
                <Select value={commodity} onValueChange={(v) => setCommodity(v as Commodity)}>
                  <SelectTrigger id="commodity"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMMODITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="basis">Базис поставки</Label>
                <Select value={basis} onValueChange={(v) => setBasis(v as DeliveryBasis)}>
                  <SelectTrigger id="basis"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXW">EXW (самовивоз)</SelectItem>
                    <SelectItem value="CPT">CPT (перевезення оплачене)</SelectItem>
                    <SelectItem value="FOB">FOB (франко-борт)</SelectItem>
                    <SelectItem value="DAP">DAP (доставлено)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="volume">Обсяг (тонн)</Label>
                <Input id="volume" type="number" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="500" min={0} step="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Ціна за тонну (грн)</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8200" min={0} step="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year">Рік врожаю</Label>
                <Input id="year" type="number" value={harvestYear} onChange={(e) => setHarvestYear(parseInt(e.target.value) || new Date().getFullYear())} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Регіон</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Полтавська обл." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Опис</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Додаткова інформація про партію..." rows={3} />
            </div>
          </div>
        </Card>

        {/* Quality params */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Параметри якості</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="moisture">Вологість (%)</Label>
              <Input id="moisture" type="number" value={moisture} onChange={(e) => setMoisture(e.target.value)} placeholder="12.5" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="protein">Протеїн (%)</Label>
              <Input id="protein" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="12.0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fm">Сміттєва домішка (%)</Label>
              <Input id="fm" type="number" value={foreignMatter} onChange={(e) => setForeignMatter(e.target.value)} placeholder="2.0" step="0.01" />
            </div>
          </div>
        </Card>

        {/* Media uploader */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Фотографії партії</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            )}
          >
            <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Перетягніть фото сюди або натисніть для вибору</p>
            <p className="text-xs text-muted-foreground">Лише локальні файли (JPG, PNG, WebP)</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>
          {mediaFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {mediaFiles.map((f, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMediaFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                    className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Documents */}
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Документи</h3>
          <p className="mb-4 text-sm text-muted-foreground">Складське свідоцтво обов'язкове. Інші документи опціональні.</p>
          <div className="space-y-3">
            <DocUpload
              label="Складське свідоцтво / Титульні документи"
              required
              file={warehouseCert}
              onChange={setWarehouseCert}
              tooltip="Документ, що підтверджує наявність продукції на складі. Без нього публікація неможлива."
            />
            <DocUpload
              label="ТТН та лабораторний аналіз"
              file={ttnLab}
              onChange={setTtnLab}
              tooltip="Товарно-транспортна накладна та результати лабораторного аналізу якості."
            />
            <DocUpload
              label="Специфікації"
              file={specifications}
              onChange={setSpecifications}
              tooltip="Технічні специфікації продукції за стандартами ДСТУ."
            />
            <DocUpload
              label="Сертифікати якості"
              file={qualityCert}
              onChange={setQualityCert}
              tooltip="Сертифікати відповідності якості від акредитованих лабораторій."
            />
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ name: 'dashboard' })}>
            Скасувати
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Публікація...' : 'Опублікувати оголошення'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DocUpload({
  label, required, file, onChange, tooltip,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  tooltip: string;
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
            <TooltipContent><p className="max-w-[240px] text-xs">{tooltip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          file ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
        )}>
          {file ? <FileCheck2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          {file ? (
            <p className="truncate text-sm font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">PDF або зображення</p>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(null); }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
