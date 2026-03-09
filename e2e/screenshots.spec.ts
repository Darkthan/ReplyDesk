import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT = path.join(__dirname, '..', 'docs', 'screenshots');

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const shot = (name: string) => path.join(OUT, name);

// ── Page de connexion ──────────────────────────────────────────────────────────

test('01-connexion', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('01-connexion.png'), fullPage: true });
});

// ── Tableau de bord utilisateur (API mockée) ──────────────────────────────────

test('03-tableau-de-bord', async ({ page }) => {
  const now = new Date().toISOString();
  const inTwoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  await page.route('/api/auth/me', (r) =>
    r.fulfill({
      json: { id: 'u1', email: 'jean.dupont@example.com', role: 'user', mail_server_id: 's1', is_active: true },
    })
  );
  await page.route('/api/servers', (r) => r.fulfill({ json: [] }));
  await page.route('/api/closures', (r) =>
    r.fulfill({
      json: [
        {
          id: 'c1',
          name: "Vacances d'été",
          start_date: '2026-07-15T00:00:00.000Z',
          end_date: '2026-08-31T23:59:00.000Z',
          default_subject: "Absent jusqu'au 31 août",
          default_message: "Je suis absent jusqu'au 31 août. Je vous répondrai à mon retour.",
          is_active: true,
          reason: null,
          created_at: now,
          updated_at: now,
        },
      ],
    })
  );
  await page.route('/api/closures/mine', (r) =>
    r.fulfill({
      json: [
        {
          id: 'c2',
          name: 'Congé formation',
          start_date: now,
          end_date: inTwoMonths,
          default_subject: 'En formation professionnelle',
          default_message: "Je suis en formation jusqu'au " + new Date(inTwoMonths).toLocaleDateString('fr-FR') + '. Je vous répondrai dès que possible.',
          is_active: true,
          reason: 'Formation professionnelle',
          created_at: now,
          updated_at: now,
        },
      ],
    })
  );
  await page.route('/api/subscriptions', (r) =>
    r.fulfill({
      json: [
        { id: 's1', closure_period_id: 'c1', user_id: 'u1', is_active: true, custom_subject: null, custom_message: null, created_at: now, updated_at: now },
        { id: 's2', closure_period_id: 'c2', user_id: 'u1', is_active: true, custom_subject: null, custom_message: null, created_at: now, updated_at: now },
      ],
    })
  );

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: shot('03-tableau-de-bord.png'), fullPage: true });
});
