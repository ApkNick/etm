import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'prices' }
  | { name: 'news' }
  | { name: 'news-detail'; id: string }
  | { name: 'map' }
  | { name: 'marketplace' }
  | { name: 'ad-detail'; id: string }
  | { name: 'create-ad' }
  | { name: 'dashboard' }
  | { name: 'deals' }
  | { name: 'deal-detail'; id: string }
  | { name: 'kyc' }
  | { name: 'admin' }
  | { name: 'auth' };

interface RouterState {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterState>({
  route: { name: 'home' },
  navigate: () => {},
});

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  const [path, ...rest] = hash.split('/');
  switch (path) {
    case 'prices': return { name: 'prices' };
    case 'news':
      if (rest[0]) return { name: 'news-detail', id: rest[0] };
      return { name: 'news' };
    case 'map': return { name: 'map' };
    case 'marketplace': return { name: 'marketplace' };
    case 'ad':
      if (rest[0]) return { name: 'ad-detail', id: rest[0] };
      return { name: 'marketplace' };
    case 'create-ad': return { name: 'create-ad' };
    case 'dashboard': return { name: 'dashboard' };
    case 'deals': return { name: 'deals' };
    case 'deal':
      if (rest[0]) return { name: 'deal-detail', id: rest[0] };
      return { name: 'deals' };
    case 'kyc': return { name: 'kyc' };
    case 'admin': return { name: 'admin' };
    case 'auth': return { name: 'auth' };
    default: return { name: 'home' };
  }
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '';
    case 'news-detail': return `news/${route.id}`;
    case 'ad-detail': return `ad/${route.id}`;
    case 'deal-detail': return `deal/${route.id}`;
    default: return route.name;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    const hash = routeToHash(r);
    window.location.hash = hash;
    setRoute(r);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
