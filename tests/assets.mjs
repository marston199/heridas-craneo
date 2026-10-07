// Generates icon-192.png, icon-512.png and og.png (link preview) from the app itself.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
const root = path.resolve(process.cwd(), '..');
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
for (const s of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: 800, height: 800 } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
  await p.locator('svg').screenshot({ path: path.join(root, `icon-${s}.png`), omitBackground: true }); await p.close();
}
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.addInitScript(`try{localStorage.setItem('onboarded','1')}catch(e){}`);
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.waitForFunction(() => window.__ready === true);
await page.click('#presentBtn'); await page.waitForTimeout(500);
const settle = async () => { for (let i = 0; i < 60; i++) { if (!(await page.evaluate('__app.glLost()'))) return; await page.waitForTimeout(250); } };
await settle();
await page.evaluate(`__app.setView('compare'); __app.setT(0.95); document.getElementById('toast').classList.remove('show')`);
await page.waitForTimeout(400); await settle(); await page.evaluate('__app.redraw()');
await page.screenshot({ path: path.join(root, 'og.png') });
console.log('assets written');
await browser.close();
