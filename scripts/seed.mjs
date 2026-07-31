import { Pool } from 'pg';
import Redis from 'ioredis';
import { Meilisearch } from 'meilisearch';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// One-time demo fixture data so a fresh click-deploy shows real rows,
// search hits, a populated activity feed, and an uploaded object before
// the porter has created anything themselves. Gated in zerops.yaml by the
// static `${INIT_SEED}` execOnce key (not `${appVersionId}`) so this runs
// exactly once ever, never again on redeploy -- re-running an INSERT
// fixture on every deploy would duplicate demo data each release.
const SEED_USERS = [
  {
    id: 'seed-ada-lovelace',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    bio: 'Mathematician and writer, known for work on Charles Babbage\'s Analytical Engine.',
  },
  {
    id: 'seed-grace-hopper',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    bio: 'Computer scientist and Navy rear admiral; pioneered machine-independent programming languages.',
  },
  {
    id: 'seed-alan-turing',
    name: 'Alan Turing',
    email: 'alan@example.com',
    bio: 'Mathematician and logician, foundational to theoretical computer science and artificial intelligence.',
  },
  {
    id: 'seed-margaret-hamilton',
    name: 'Margaret Hamilton',
    email: 'margaret@example.com',
    bio: 'Led the team that wrote the onboard flight software for the Apollo Guidance Computer.',
  },
  {
    id: 'seed-katherine-johnson',
    name: 'Katherine Johnson',
    email: 'katherine@example.com',
    bio: 'NASA mathematician whose orbital-mechanics calculations were critical to crewed spaceflight.',
  },
];

async function seedDatabase(pool, now) {
  for (const user of SEED_USERS) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", bio, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, $4, $5, $5)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.name, user.email, user.bio, now],
    );
  }
  console.log(`seed: upserted ${SEED_USERS.length} demo users into postgres`);
}

async function seedSearch() {
  const meili = new Meilisearch({
    host: process.env.SEARCH_URL,
    apiKey: process.env.SEARCH_MASTER_KEY,
  });
  const index = meili.index('users');
  await index.updateSearchableAttributes(['name', 'bio']);
  await index.addDocuments(
    SEED_USERS.map(({ id, name, bio }) => ({ id, name, bio })),
    { primaryKey: 'id' },
  );
  console.log('seed: indexed demo users into meilisearch');
}

async function seedActivityFeed(now) {
  const cache = new Redis(process.env.CACHE_URL);
  try {
    const entries = SEED_USERS.slice(0, 3).map((user, i) =>
      JSON.stringify({
        type: 'signup',
        userId: user.id,
        name: user.name,
        timestamp: new Date(now.getTime() - i * 1000).toISOString(),
        processedAt: new Date(now.getTime() - i * 1000).toISOString(),
      }),
    );
    // Insert oldest-first so the newest seed entry ends up at LPUSH's
    // head, matching the "newest-first" contract every other seed path
    // (and every live publish) produces.
    await cache.lpush('queue:recent-activity', ...entries.slice().reverse());
    await cache.ltrim('queue:recent-activity', 0, 19);
    await cache.incrby('queue:processed', entries.length);
    console.log(`seed: seeded ${entries.length} recent-activity entries`);
  } finally {
    await cache.quit();
  }
}

async function seedStorage(now) {
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  const key = `avatars/seed-welcome-${now.getTime()}.txt`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: 'Analog + Better Auth showcase -- seed upload, safe to delete.',
      ContentType: 'text/plain',
    }),
  );
  console.log(`seed: uploaded seed object ${key}`);
}

async function main() {
  const now = new Date();
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await seedDatabase(pool, now);
    await seedSearch();
    await seedActivityFeed(now);
    await seedStorage(now);
    console.log('seed: complete');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
