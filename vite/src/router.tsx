import { createRootRoute, createRoute, createRouter } from '@tanstack/solid-router';
import App from './App';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Plans from './pages/Plans';

/** App 作为根路由 component（提供 admin 布局），页面经 Outlet 注入。 */
const rootRoute = createRootRoute({ component: App });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const plansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans',
  component: Plans,
});

/** catch-all 放在最后，优先级低于上面两条精确路由。 */
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFound,
});

const routeTree = rootRoute.addChildren([indexRoute, plansRoute, catchAllRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router;
  }
}
