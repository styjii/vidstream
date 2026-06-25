import { type RouteConfig, route, index, layout } from '@react-router/dev/routes'

export default [
  layout('routes/_layout.tsx', [
    index('routes/home.tsx'),
    route('player/:id', 'routes/player.tsx'),
    route('upload', 'routes/upload.tsx'),
    route('settings', 'routes/settings.tsx'),
    route('history', 'routes/history.tsx'),
  ]),
] satisfies RouteConfig
