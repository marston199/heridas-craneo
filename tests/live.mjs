// Checks the published site: waits until GitHub Pages serves it, then loads it like a visitor would (desktop + phone).
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
const URL_ = process.argv[2] || 'https://marston199.github.io/heridas-craneo/';
const shots = path.join(process.cwd(), 'shots'); fs.mkdirSync(shots, { recursive: true });
for (let i = 0; i < 60; i++) {                                   // up to ~5 minutes for the first Pages build
  try { const r = await fetch(URL_ + 'js/main.js', { cache: 'no-store' }); if (r.ok) { console.log('site is up (' + r.status + ')'); break; } console.log('status', r.status); } catch (e) { console.log('waiting…'); }
  await new Promise(r => setTimeout(r, 5000));
}
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const res = [];
for (const vp of [{ w: 1366, h: 768, n: 'desktop' }, { w: 390, h: 844, n: 'phone', mobile: true }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { const x = m.text(); if (m.type() === 'error' && !/VALIDATE_STATUS false/.test(x)) errs.push(x); });
  page.on('pageerror', e => errs.push(e.message));
  page.on('requestfailed', r => errs.push('request failed: ' + r.url()));
  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const tReady = Date.now() - t0;
  const model = await page.waitForFunction(() => window.__app.info().skullSource === 'model', null, { timeout: 40000 }).then(() => true).catch(() => false);
  await page.click('#startBtn'); await page.waitForTimeout(800);
  await page.evaluate(`(function(){var c=document.getElementById('coachSkip'); if(c && document.getElementById('coach').style.display!=='none') c.click();})()`);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 40; i++) { if (!(await page.evaluate('__app.glLost()'))) break; await page.waitForTimeout(250); }
  await page.evaluate('__app.redraw()');
  await page.screenshot({ path: path.join(shots, 'live-' + vp.n + '.png') });
  const sw = await page.evaluate(`navigator.serviceWorker ? navigator.serviceWorker.getRegistration().then(r => !!r) : false`);
  res.push({ viewport: vp.n, readyMs: tReady, skullModel: model, serviceWorker: sw, errors: errs.slice(0, 5) });
  await ctx.close();
}
console.log(JSON.stringify(res, null, 1));
await browser.close();
process.exit(res.every(r => r.errors.length === 0 && r.skullModel) ? 0 : 1);
