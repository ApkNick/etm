import { useEffect, useState } from 'react';
import { Map as MapIcon, Warehouse, TrendingUp, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { COMMODITY_SHORT, type Commodity, type Price } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Elevator {
  name: string;
  x: number;
  y: number;
  capacity: number;
  region: string;
}

const ELEVATORS: Elevator[] = [
  { name: 'Одеський елеватор', x: 62, y: 78, capacity: 180000, region: 'Одеська обл.' },
  { name: 'Миколаївський порт', x: 58, y: 72, capacity: 250000, region: 'Миколаївська обл.' },
  { name: 'Київський ХПП', x: 50, y: 42, capacity: 120000, region: 'Київська обл.' },
  { name: 'Полтавський елеватор', x: 56, y: 48, capacity: 95000, region: 'Полтавська обл.' },
  { name: 'Харківський ХПП', x: 64, y: 44, capacity: 140000, region: 'Харківська обл.' },
  { name: 'Дніпровський елеватор', x: 58, y: 52, capacity: 110000, region: 'Дніпропетровська обл.' },
  { name: 'Запорізький ХПП', x: 60, y: 58, capacity: 88000, region: 'Запорізька обл.' },
  { name: 'Вінницький елеватор', x: 42, y: 50, capacity: 105000, region: 'Вінницька обл.' },
  { name: 'Львівський ХПП', x: 28, y: 48, capacity: 75000, region: 'Львівська обл.' },
  { name: 'Черкаський елеватор', x: 48, y: 52, capacity: 82000, region: 'Черкаська обл.' },
];

const COMMODITIES: Commodity[] = ['grain', 'corn', 'sunflower', 'rapeseed', 'sugar', 'meal'];

export function MapPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity>('grain');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prices')
        .select('*')
        .order('recorded_on', { ascending: false });
      if (data) setPrices(data as Price[]);
    })();
  }, []);

  const getRegionPrice = (region: string, commodity: Commodity) => {
    const regionPrices = prices.filter(p => p.commodity === commodity && p.region?.includes(region.split(' ')[0]));
    if (regionPrices.length === 0) return null;
    return Number(regionPrices[0].price_uah);
  };

  const maxCapacity = Math.max(...ELEVATORS.map(e => e.capacity));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Інтерактивна карта</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Потужності елеваторів та регіональні ціни на агрокультури
        </p>
      </div>

      {/* Commodity selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {COMMODITIES.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCommodity(c)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCommodity === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'
            )}
          >
            {COMMODITY_SHORT[c]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2 p-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 to-accent/5">
            <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full">
              {/* Simplified Ukraine outline */}
              <path
                d="M 20,35 L 25,28 L 35,25 L 45,22 L 55,20 L 65,22 L 72,28 L 75,35 L 78,42 L 75,50 L 70,58 L 65,65 L 58,72 L 52,75 L 45,73 L 38,70 L 32,65 L 25,58 L 22,50 L 18,42 Z"
                fill="hsl(var(--primary) / 0.08)"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="0.3"
              />
            </svg>

            {/* Elevators */}
            {ELEVATORS.map(e => {
              const size = 4 + (e.capacity / maxCapacity) * 8;
              const price = getRegionPrice(e.region, selectedCommodity);
              return (
                <TooltipProvider key={e.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
                        style={{ left: `${e.x}%`, top: `${e.y}%` }}

                      >
                        <div
                          className="flex items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-lg ring-2 ring-primary/20"
                          style={{ width: `${size * 3}px`, height: `${size * 3}px` }}
                        >
                          <Warehouse className="h-3 w-3" />
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-muted-foreground">{e.region}</p>
                        <p>Потужність: {(e.capacity / 1000).toFixed(0)} тис. т</p>
                        {price && <p className="text-primary font-medium">{COMMODITY_SHORT[selectedCommodity]}: {price.toLocaleString('uk-UA')} грн/т</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 rounded-lg bg-card/90 p-3 text-xs backdrop-blur">
              <p className="mb-1.5 font-semibold">Потужність елеваторів</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary/60" />
                <span className="text-muted-foreground">менше</span>
                <div className="h-3 w-3 rounded-full bg-primary/80" />
                <div className="h-4 w-4 rounded-full bg-primary" />
                <span className="text-muted-foreground">більше</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Регіональні ціни: {COMMODITY_SHORT[selectedCommodity]}
            </h3>
            <div className="space-y-2">
              {ELEVATORS.map(e => {
                const price = getRegionPrice(e.region, selectedCommodity);
                return (
                  <div key={e.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.region}</p>
                    </div>
                    <div className="text-right">
                      {price ? (
                        <p className="font-semibold text-primary">{price.toLocaleString('uk-UA')}<span className="text-xs font-normal text-muted-foreground"> грн/т</span></p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-info" />
              <p className="text-xs text-muted-foreground">
                Розмір маркера пропорційний потужності елеватора. Наведіть курсор для деталей.
                Ціни оновлюються щодня на основі даних ринку.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
