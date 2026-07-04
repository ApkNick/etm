import { useState } from 'react';
import { Sprout, Store, ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

export function AuthPage() {
  const { navigate } = useRouter();
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<Role>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Пароль має містити мінімум 6 символів');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, display_name: displayName } },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            role,
            display_name: displayName,
            phone,
          });
        }
        await refreshProfile();
        navigate({ name: 'kyc' });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        await refreshProfile();
        navigate({ name: 'dashboard' });
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Невірний email або пароль'
        : err.message || 'Сталася помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">
            {mode === 'signin' ? 'Вхід у кабінет' : 'Реєстрація на платформі'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin' ? 'Увійдіть у свій акаунт' : 'Створіть акаунт для торгівлі'}
          </p>
        </div>

        <Card className="p-6">
          {mode === 'signup' && (
            <div className="mb-5">
              <Label className="mb-2 block">Оберіть роль</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                    role === 'seller' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  <Store className={cn('h-7 w-7', role === 'seller' ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-semibold">Продавець</p>
                    <p className="text-[11px] text-muted-foreground">Фермер / Елеватор</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                    role === 'buyer' ? 'border-info bg-info/5' : 'border-border hover:border-info/40'
                  )}
                >
                  <ShoppingBag className={cn('h-7 w-7', role === 'buyer' ? 'text-info' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-semibold">Покупець</p>
                    <p className="text-[11px] text-muted-foreground">Трейдер / Експортер</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Ім'я / Назва</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Іван Петренко / ТОВ Агро"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380 50 123 45 67"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Мінімум 6 символів"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Зачекайте...' : mode === 'signin' ? 'Увійти' : 'Зареєструватися'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === 'signin' ? 'Немає акаунту? ' : 'Вже є акаунт? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-medium text-primary hover:underline"
            >
              {mode === 'signin' ? 'Зареєструватися' : 'Увійти'}
            </button>
          </div>
        </Card>

        {mode === 'signup' && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Після реєстрації вам буде запропоновано пройти верифікацію KYC/KYB
            для доступу до торгової площадки.
          </p>
        )}
      </div>
    </div>
  );
}
