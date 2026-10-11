import { seedDemo } from '../../scripts/seed';

export default async function globalSetup() {
  process.env.GCLOUD_PROJECT ??= 'demo-wedding-budget';
  await seedDemo();
}
