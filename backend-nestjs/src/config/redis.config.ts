import { registerAs } from '@nestjs/config';

function parseRedisUrl(redisUrl?: string) {
  if (!redisUrl) {
    return null;
  }

  const parsed = new URL(redisUrl);

  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined,
    tls: parsed.protocol === 'rediss:',
  };
}

export default registerAs('redis', () => ({
  ...(() => {
    const fromUrl = parseRedisUrl(process.env.REDIS_URL);

    return {
      host: process.env.REDIS_HOST || fromUrl?.host || 'localhost',
      port: parseInt(
        process.env.REDIS_PORT ?? String(fromUrl?.port ?? 6379),
        10,
      ),
      password: process.env.REDIS_PASSWORD ?? fromUrl?.password,
      tls: process.env.REDIS_TLS
        ? process.env.REDIS_TLS === 'true'
        : Boolean(fromUrl?.tls),
    };
  })(),
}));
