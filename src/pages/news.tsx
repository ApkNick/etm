import { useEffect, useState, useMemo } from 'react';
import { Newspaper, ArrowRight, Calendar, User } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/lib/types';

export function NewsPage() {
  const { navigate } = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false });
      if (data) setArticles(data as NewsArticle[]);
      setLoading(false);
    })();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(a => a.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles;
    if (activeTag) result = result.filter(a => a.tags?.includes(activeTag));
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s));
    }
    return result;
  }, [articles, activeTag, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Новини та аналітика</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Ринкові звіти, погодні прогнози, експортна аналітика</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Пошук новин..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!activeTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}
          >
            Всі
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Статей не знайдено</Card>
      ) : (
        <div className="space-y-5">
          {featured && (
            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              onClick={() => navigate({ name: 'news-detail', id: featured.id })}
            >
              <div className="grid gap-0 sm:grid-cols-2">
                {featured.image_url && (
                  <div className="h-48 overflow-hidden sm:h-full">
                    <img src={featured.image_url} alt={featured.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {featured.tags?.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                  <h2 className="mb-2 text-xl font-bold group-hover:text-primary">{featured.title}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{featured.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {featured.author && <span className="flex items-center gap-1"><User className="h-3 w-3" />{featured.author}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(featured.published_at).toLocaleDateString('uk-UA')}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {rest.map(article => (
            <Card
              key={article.id}
              className="group cursor-pointer p-5 transition-all hover:shadow-md"
              onClick={() => navigate({ name: 'news-detail', id: article.id })}
            >
              <div className="flex gap-4">
                {article.image_url && (
                  <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:block">
                    <img src={article.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {article.tags?.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                  <h3 className="mb-1 font-semibold group-hover:text-primary">{article.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(article.published_at).toLocaleDateString('uk-UA')}</span>
                    <span className="flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Читати <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewsDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('news').select('*').eq('id', id).maybeSingle();
      if (data) setArticle(data as NewsArticle);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-12"><Card className="h-96 animate-pulse bg-muted" /></div>;
  if (!article) return <div className="px-4 py-12 text-center text-muted-foreground">Статтю не знайдено</div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 animate-fade-in">
      <button onClick={() => navigate({ name: 'news' })} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
        ← Всі новини
      </button>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {article.tags?.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
      </div>
      <h1 className="mb-3 text-3xl font-bold text-balance">{article.title}</h1>
      <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        {article.author && <span className="flex items-center gap-1"><User className="h-4 w-4" />{article.author}</span>}
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(article.published_at).toLocaleDateString('uk-UA')}</span>
      </div>
      {article.image_url && (
        <img src={article.image_url} alt={article.title} className="mb-6 h-64 w-full rounded-xl object-cover" />
      )}
      <p className="mb-4 text-lg font-medium text-muted-foreground">{article.summary}</p>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{article.body}</div>
    </article>
  );
}
