import { useEffect, useState } from 'react';
import { Sprout, TrendingUp, ShieldCheck, Zap, ArrowRight, Store, LineChart, Newspaper, Map } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { COMMODITY_SHORT, type Commodity, type Price } from '@/lib/types';
import { LineChart as RLineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COMMODITIES: Commodity[] = ['grain', 'corn', 'sunflower', 'rapeseed', 'sugar', 'meal'];

export function HomePage() {
  const { navigate } = useRouter();
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [adCount, setAdCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'active');
      setAdCount(count ?? 0);

      for (const c of COMMODITIES) {
        const { data } = await supabase
          .from('prices')
          .select('*')
          .eq('commodity', c)
          .eq('delivery_basis', 'CPT')
          .order('recorded_on', { ascending: true })
          .limit(30);
        if (data) setPrices((p) => ({ ...p, [c]: data }));
      }
    })();
  }, []);

  const latestPrice = (c: Commodity) => {
    const arr = prices[c];
    if (!arr || arr.length === 0) return null;
    return arr[arr.length - 1];
  };

  const features = [
    { icon: Store, title: 'Торгова площадка', desc: 'Прямі угоди між фермерами та покупцями без посередників', route: { name: 'marketplace' as const } },
    { icon: LineChart, title: 'Аналітика цін', desc: 'Щоденні ціни на основні агрокультури за базісами поставки', route: { name: 'prices' as const } },
    { icon: Newspaper, title: 'Новини та аналітика', desc: 'Ринкові звіти, погодні прогнози, експортна аналітика', route: { name: 'news' as const } },
    { icon: Map, title: 'Інтерактивна карта', desc: 'Потужності елеваторів та регіональні ціни в реальному часі', route: { name: 'map' as const } },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-accent/5">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sprout className="h-4 w-4" />
              B2B Аграрна платформа України
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Торговельна площадка та аналітичний портал для агробізнесу
            </h1>
            <p className="mt-6 text-balance text-lg text-muted-foreground">
              Прямі угоди на зерно, кукурудзу, соняшник, ріпак, цукор та шрот.
              Аналітика цін, верифіковані контрагенти, швидка домовленість з електронним підписанням.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate({ name: 'marketplace' })} className="w-full sm:w-auto">
                <Store className="mr-2 h-5 w-5" />
                Перейти на ринок
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ name: 'auth' })} className="w-full sm:w-auto">
                Почати торгувати
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Верифікація KYC/KYB</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-accent" /> Швидка домовленість</span>
              <span className="hidden items-center gap-1.5 sm:flex"><TrendingUp className="h-4 w-4 text-info" /> {adCount} активних оголошень</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group cursor-pointer p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              onClick={() => navigate(f.route)}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
              <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Переглянути <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Price ticker */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Індекс цін на агрокультури</h2>
              <p className="text-sm text-muted-foreground">Щоденні ціни CPT, грн/т</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate({ name: 'prices' })}>
              Детальна аналітика <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMODITIES.map((c) => {
              const latest = latestPrice(c);
              const series = (prices[c] || []).map((p) => ({ date: p.recorded_on, price: Number(p.price_uah) }));
              const prev = series.length > 1 ? series[series.length - 2]?.price : null;
              const change = latest && prev ? Number(latest.price_uah) - prev : 0;
              const changePct = prev ? (change / prev) * 100 : 0;
              return (
                <Card key={c} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{COMMODITY_SHORT[c]}</span>
                    {latest && (
                      <span className={`text-xs font-medium ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {change >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mb-2 text-2xl font-bold">
                    {latest ? `${Math.round(Number(latest.price_uah)).toLocaleString('uk-UA')}` : '—'}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">грн/т</span>
                  </div>
                  <div className="h-12">
                    {series.length > 1 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RLineChart data={series}>
                          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Tooltip
                            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                            formatter={(v: number) => [`${Math.round(v)} грн/т`, 'Ціна']}
                            labelFormatter={() => ''}
                          />
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                        </RLineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Flash Deal CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground sm:p-12">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                <Zap className="h-4 w-4" />
                Швидка домовленість
              </div>
              <h2 className="text-3xl font-bold text-balance">
                Угода в 1 клік з автоматичним генеруванням договору
              </h2>
              <p className="mt-3 text-primary-foreground/80">
                Покупець ініціює угоду, система підставляє KYC-дані обох сторін у юридичний шаблон,
                додає складські свідоцтва як додатки та формує PDF-договір для підписання.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate({ name: 'marketplace' })}
              className="shrink-0 bg-white text-primary hover:bg-white/90"
            >
              Знайти пропозицію <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
