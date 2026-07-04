import { useEffect, useState } from 'react';
import { ShieldCheck, Users, FileText, TrendingUp, CheckCircle2, XCircle, Edit, Save, Plus, Trash2 } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COMMODITY_SHORT, COMMODITY_LABELS, CONTRACT_TYPE_LABELS, type Profile, type KycRecord, type ContractTemplate, type Price, type Commodity, type DeliveryBasis } from '@/lib/types';


export function AdminPage() {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const [tab, setTab] = useState('kyc');
  const [kycList, setKycList] = useState<(KycRecord & { profile?: Profile })[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [newPrice, setNewPrice] = useState({ commodity: 'grain' as Commodity, basis: 'CPT' as DeliveryBasis, price: '', region: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { navigate({ name: 'home' }); return; }
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    const { data: kycData } = await supabase
      .from('kyc_records')
      .select('*, profiles!kyc_records_user_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (kycData) setKycList(kycData as any);

    const { data: tplData } = await supabase.from('contract_templates').select('*').order('contract_type');
    if (tplData) setTemplates(tplData as ContractTemplate[]);

    const { data: priceData } = await supabase.from('prices').select('*').order('recorded_on', { ascending: false }).limit(50);
    if (priceData) setPrices(priceData as Price[]);
  };

  const handleKycAction = async (kyc: KycRecord & { profile?: Profile }, action: 'approved' | 'rejected') => {
    await supabase.from('kyc_records').update({
      admin_notes: action === 'approved' ? 'Верифіковано' : 'Відхилено',
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile?.id,
    }).eq('id', kyc.id);
    await supabase.from('profiles').update({ kyc_status: action }).eq('id', kyc.user_id);
    loadAll();
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    await supabase.from('contract_templates').update({
      title: editingTemplate.title,
      template_body: editingTemplate.template_body,
    }).eq('id', editingTemplate.id);
    setEditingTemplate(null);
    loadAll();
  };

  const handleAddPrice = async () => {
    if (!newPrice.price) return;
    await supabase.from('prices').insert({
      commodity: newPrice.commodity,
      delivery_basis: newPrice.basis,
      price_uah: parseFloat(newPrice.price),
      region: newPrice.region || null,
      recorded_on: new Date().toISOString().split('T')[0],
    });
    setNewPrice({ ...newPrice, price: '', region: '' });
    loadAll();
  };

  const handleDeletePrice = async (id: string) => {
    await supabase.from('prices').delete().eq('id', id);
    loadAll();
  };

  if (!profile || profile.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Адмін-панель</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Керування платформою</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kyc"><Users className="mr-1.5 h-4 w-4" /> KYC</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="mr-1.5 h-4 w-4" /> Шаблони</TabsTrigger>
          <TabsTrigger value="prices"><TrendingUp className="mr-1.5 h-4 w-4" /> Ціни</TabsTrigger>
        </TabsList>

        {/* KYC Management */}
        <TabsContent value="kyc" className="mt-4 space-y-3">
          {kycList.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Заявок на верифікацію немає</Card>
          ) : (
            kycList.map(kyc => (
              <Card key={kyc.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-semibold">{kyc.legal_name}</p>
                      <Badge variant="outline" className="text-[10px]">{kyc.company_type === 'legal' ? 'Юр. особа' : 'ФОП'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">ЄДРПОУ: {kyc.usreou}</p>
                    <p className="text-sm text-muted-foreground">IBAN: {kyc.iban}</p>
                    <p className="text-sm text-muted-foreground">Банк: {kyc.bank_name}</p>
                    <p className="text-xs text-muted-foreground">Email: {kyc.profile?.email}</p>
                    <div className="mt-2 flex gap-2">
                      {kyc.register_extract_path && (
                        <a href={supabase.storage.from('kyc-docs').getPublicUrl(kyc.register_extract_path).data.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Витяг з реєстру</a>
                      )}
                      {kyc.tax_certificate_path && (
                        <a href={supabase.storage.from('kyc-docs').getPublicUrl(kyc.tax_certificate_path).data.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Податковий сертифікат</a>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {kyc.profile?.kyc_status === 'pending' ? (
                      <>
                        <Button size="sm" onClick={() => handleKycAction(kyc, 'approved')}>
                          <CheckCircle2 className="mr-1 h-4 w-4 text-success-foreground" /> Прийняти
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleKycAction(kyc, 'rejected')}>
                          <XCircle className="mr-1 h-4 w-4" /> Відхилити
                        </Button>
                      </>
                    ) : (
                      <Badge className={kyc.profile?.kyc_status === 'approved' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}>
                        {kyc.profile?.kyc_status === 'approved' ? 'Верифіковано' : 'Відхилено'}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Contract Templates */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="p-4">
              {editingTemplate?.id === tpl.id ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Назва</Label>
                    <Input value={editingTemplate.title} onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Текст шаблону (змінні: {'{{buyer_name}}, {{seller_name}}, {{crop_price}} і т.д.'})</Label>
                    <Textarea value={editingTemplate.template_body} onChange={(e) => setEditingTemplate({ ...editingTemplate, template_body: e.target.value })} rows={12} className="font-mono text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTemplate}><Save className="mr-1 h-4 w-4" /> Зберегти</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>Скасувати</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{tpl.title}</p>
                    <p className="text-xs text-muted-foreground">{CONTRACT_TYPE_LABELS[tpl.contract_type]}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tpl.template_body.slice(0, 120)}...</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate(tpl)}>
                    <Edit className="mr-1 h-4 w-4" /> Редагувати
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Price Management */}
        <TabsContent value="prices" className="mt-4 space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Додати ціну</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Культура</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newPrice.commodity} onChange={(e) => setNewPrice({ ...newPrice, commodity: e.target.value as Commodity })}>
                  {Object.entries(COMMODITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Базис</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newPrice.basis} onChange={(e) => setNewPrice({ ...newPrice, basis: e.target.value as DeliveryBasis })}>
                  <option value="EXW">EXW</option>
                  <option value="CPT">CPT</option>
                  <option value="FOB">FOB</option>
                  <option value="DAP">DAP</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ціна (грн/т)</Label>
                <Input type="number" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} placeholder="8200" />
              </div>
              <div className="flex items-end gap-2">
                <Input value={newPrice.region} onChange={(e) => setNewPrice({ ...newPrice, region: e.target.value })} placeholder="Регіон" className="flex-1" />
                <Button size="sm" onClick={handleAddPrice}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Культура</th>
                    <th className="px-3 py-2 text-left font-semibold">Базис</th>
                    <th className="px-3 py-2 text-right font-semibold">Ціна</th>
                    <th className="px-3 py-2 text-left font-semibold">Регіон</th>
                    <th className="px-3 py-2 text-left font-semibold">Дата</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{COMMODITY_SHORT[p.commodity]}</td>
                      <td className="px-3 py-2">{p.delivery_basis}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(p.price_uah).toLocaleString('uk-UA')}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.region || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.recorded_on}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleDeletePrice(p.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
