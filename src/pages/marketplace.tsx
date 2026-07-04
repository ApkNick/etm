import { useEffect, useState, useMemo } from 'react';
import { Search, Store, MapPin, Calendar, Package } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMMODITY_LABELS, COMMODITY_SHORT, COMMODITY_ICONS, type Ad } from '@/lib/types';


export function MarketplacePage() {
  const { navigate } = useRouter();
  const [ads, setAds] = useState<(Ad & { seller_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<string>('all');
  const [basisFilter, setBasisFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from('ads')
        .select('*, profiles!ads_seller_id_fkey(display_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map((a: any) => ({
          ...a,
          seller_name: a.profiles?.display_name,
        })) as (Ad & { seller_name?: string })[];
        setAds(mapped);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = ads;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(s) ||
        a.region?.toLowerCase().includes(s) ||
        a.description?.toLowerCase().includes(s)
      );
    }
    if (commodityFilter !== 'all') result = result.filter(a => a.commodity === commodityFilter);
    if (basisFilter !== 'all') result = result.filter(a => a.delivery_basis === basisFilter);

    if (sortBy === 'price_asc') result = [...result].sort((a, b) => a.price_per_ton - b.price_per_ton);
    if (sortBy === 'price_desc') result = [...result].sort((a, b) => b.price_per_ton - a.price_per_ton);
    if (sortBy === 'volume_desc') result = [...result].sort((a, b) => b.volume_tons - a.volume_tons);

    return result;
  }, [ads, search, commodityFilter, basisFilter, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Торгова площадка</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Прямі пропозиції від верифікованих фермерів та елеваторів
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Пошук за назвою, регіоном, описом..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Культура" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі культури</SelectItem>
              {Object.entries(COMMODITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={basisFilter} onValueChange={setBasisFilter}>
            <SelectTrigger className="w-full lg:w-[140px]">
              <SelectValue placeholder="Базис" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі базиси</SelectItem>
              <SelectItem value="EXW">EXW</SelectItem>
              <SelectItem value="CPT">CPT</SelectItem>
              <SelectItem value="FOB">FOB</SelectItem>
              <SelectItem value="DAP">DAP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Сортування" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Нові спочатку</SelectItem>
              <SelectItem value="price_asc">Ціна ↑</SelectItem>
              <SelectItem value="price_desc">Ціна ↓</SelectItem>
              <SelectItem value="volume_desc">Обсяг ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">Пропозицій не знайдено</p>
          <p className="text-sm text-muted-foreground">Спробуйте змінити фільтри</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ad) => (
            <Card
              key={ad.id}
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
              onClick={() => navigate({ name: 'ad-detail', id: ad.id })}
            >
              <div className="relative h-32 bg-gradient-to-br from-primary/10 to-accent/10">
                {ad.media_paths && ad.media_paths.length > 0 ? (
                  <img
                    src={supabase.storage.from('ad-media').getPublicUrl(ad.media_paths[0]).data.publicUrl}
                    alt={ad.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">
                    {COMMODITY_ICONS[ad.commodity]}
                  </div>
                )}
                <Badge className="absolute left-3 top-3 bg-card/90 backdrop-blur">
                  {COMMODITY_SHORT[ad.commodity]}
                </Badge>
                <Badge className="absolute right-3 top-3 bg-primary/90 text-primary-foreground">
                  {ad.delivery_basis}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="mb-1 truncate font-semibold group-hover:text-primary">{ad.title}</h3>
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  {ad.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.region}</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{ad.harvest_year}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {Number(ad.price_per_ton).toLocaleString('uk-UA')}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">грн/т</span>
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      {Number(ad.volume_tons).toLocaleString('uk-UA')} т
                    </p>
                  </div>
                  {ad.seller_name && (
                    <span className="max-w-[100px] truncate text-xs text-muted-foreground">{ad.seller_name}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
