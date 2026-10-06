import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

const requiredRoutes = [
  'dashboard', 'geospatial', 'global', 'incidents', 'alerts', 'resources',
  'intelligence', 'analytics', 'timeline', 'scenario', 'notifications',
  'profile', 'settings', 'help', 'status', 'signin', 'signup',
];

test('prototype contains every user-facing module route', () => {
  for (const route of requiredRoutes) {
    const file = path.join(root, 'src', 'app', route, 'page.tsx');
    assert.equal(fs.existsSync(file), true, `missing route: /${route}`);
  }
});

test('prototype safety boundary is explicit', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /PROTOTYPE ONLY/i);
  assert.match(readme, /NOT FOR PRODUCTION|NOT FOR .*EMERGENCY/i);
  assert.match(readme, /fictional|synthetic/i);
  assert.match(readme, /localStorage/i);
});

test('prototype has demo-local CRUD services for the interactive workspace', () => {
  const services = ['alertService.ts', 'incidentService.ts', 'notificationService.ts', 'resourceService.ts', 'intelligenceService.ts'];
  for (const service of services) {
    const text = fs.readFileSync(path.join(root, 'src', 'lib', 'services', service), 'utf8');
    assert.match(text, /createDemoCollection/);
    assert.match(text, /isDemo/);
  }
});

test('prototype exposes automated verification commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['prototype:test']);
  assert.ok(pkg.scripts['prototype:verify']);
});
const server = fs.readFileSync(new URL('../isie_backend/server.py', import.meta.url), 'utf8');
assert.match(server, /startup\/readiness/);
assert.match(server, /model-validation/);
