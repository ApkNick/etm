import { useEffect, useState, useMemo } from 'react';
import { LineChart as LineIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { COMMODITY_SHORT, COMMODITY_LABELS, type Commodity, type DeliveryBasis, type Price } from '@/lib/types';

const COMMODITIES: Commodity[] = ['grain', 'corn', 'sunflower', 'rapeseed', 'sugar', 'meal'];
const BASES: DeliveryBasis[] = ['EXW', 'CPT', 'FOB'];

export function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [commodity, setCommodity] = useState<Commodity>('grain');
  const [basis, setBasis] = useState<DeliveryBasis>('CPT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('prices')
        .select('*')
        .order('recorded_on', { ascending: true });
      if (data) setPrices(data as Price[]);
      setLoading(false);
    })();
  }, []);

  const chartData = useMemo(() => {
    const filtered = prices.filter(p => p.commodity === commodity && p.delivery_basis === basis);
    return filtered.map(p => ({
      date: p.recorded_on,
      price: Number(p.price_uah),
      region: p.region,
    }));
  }, [prices, commodity, basis]);

  const latest = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const prev = chartData.length > 1 ? chartData[chartData.length - 2].price : 0;
  const change = latest - prev;
  const changePct = prev ? (change / prev) * 100 : 0;

  // All commodities latest CPT prices for table
  const tableData = useMemo(() => {
    return COMMODITIES.map(c => {
      const cPrices = prices.filter(p => p.commodity === c);
      const result: Record<string, number | string> = { commodity: c };
      for (const b of BASES) {
        const arr = cPrices.filter(p => p.delivery_basis === b).sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
        result[b] = arr.length > 0 ? Number(arr[arr.length - 1].price_uah) : '—';
      }
      const cptArr = cPrices.filter(p => p.delivery_basis === 'CPT').sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
      const cptPrev = cptArr.length > 1 ? Number(cptArr[cptArr.length - 2].price_uah) : null;
      const cptLatest = cptArr.length > 0 ? Number(cptArr[cptArr.length - 1].price_uah) : 0;
      result['change'] = cptPrev !== null ? cptLatest - cptPrev : 0;
      return result;
    });
  }, [prices]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <LineIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Індекс цін на агрокультури</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Щоденні ціни за базісами поставки, грн/т</p>
      </div>

      {/* Price table */}
      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Культура</th>
                {BASES.map(b => <th key={b} className="px-4 py-3 text-right font-semibold">{b}</th>)}
                <th className="px-4 py-3 text-right font-semibold">Зміна CPT</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.commodity as string} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{COMMODITY_SHORT[row.commodity as Commodity]}</td>
                  {BASES.map(b => (
                    <td key={b} className="px-4 py-3 text-right tabular-nums">
                      {typeof row[b] === 'number' ? `${Number(row[b]).toLocaleString('uk-UA')}` : '—'}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(row.change) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {Number(row.change) >= 0 ? '+' : ''}{Number(row.change).toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Історичний графік цін</h3>
            <p className="text-sm text-muted-foreground">{COMMODITY_LABELS[commodity]} — {basis}</p>
          </div>
          <div className="flex gap-2">
            <Select value={commodity} onValueChange={(v) => setCommodity(v as Commodity)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMODITIES.map(c => <SelectItem key={c} value={c}>{COMMODITY_SHORT[c]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={basis} onValueChange={(v) => setBasis(v as DeliveryBasis)}>
              <TabsList>
                {BASES.map(b => <TabsTrigger key={b} value={b}>{b}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="mb-4 flex items-baseline gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Поточна ціна</p>
            <p className="text-3xl font-bold text-primary">{Math.round(latest).toLocaleString('uk-UA')}<span className="ml-1 text-sm font-normal text-muted-foreground">грн/т</span></p>
          </div>
          {change !== 0 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="h-80">
          {!loading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                  formatter={(v: number) => [`${Math.round(v).toLocaleString('uk-UA')} грн/т`, 'Ціна']}
                />
                <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {loading && <div className="flex h-full items-center justify-center text-muted-foreground">Завантаження...</div>}
        </div>
      </Card>
    </div>
  );
}
