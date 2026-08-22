import { jwtConfig } from './jwt.config';

export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'Dinar API',
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
  },
  jwt: jwtConfig(),
});
