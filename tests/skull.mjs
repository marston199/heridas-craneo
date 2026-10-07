// quick skull-model check: node skull.mjs <rx> <ry> <rz> <tag>   (angles in degrees)
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
const [, , rx = '0', ry = '90', rz = '0', tag = 'x'] = process.argv;
const root = path.resolve(process.cwd(), '..');
const shots = path.join(process.cwd(), 'shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
const r = [rx, ry, rz].map(v => +v * Math.PI / 180);
await page.addInitScript(`window.App = window.App || {}; window.App.skullRot = ${JSON.stringify(r)}; window.__noSkullModel = ${process.env.NOMODEL === '1'}; window.__dbg = ${process.env.DBG || '{}'};`);
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.waitForFunction(() => window.__ready === true);
await page.waitForFunction(() => window.__skullInfo !== undefined, null, { timeout: 20000 }).catch(() => console.log('model did not load'));
console.log('skullInfo', JSON.stringify(await page.evaluate('window.__skullInfo')), await page.evaluate('__app.info().skullSource'));
await page.evaluate(`document.getElementById('startBtn').click()`); await page.waitForTimeout(400);
await page.evaluate(`(function(){ var c=document.getElementById('coachSkip'); if(c) c.click(); })()`);
await page.evaluate(`__app.setView('skull'); __app.setT(0.95); document.getElementById('hud').classList.remove('show')`);
const settle = async () => { for (let i = 0; i < 40; i++) { if (!(await page.evaluate('__app.glLost()'))) return; await page.waitForTimeout(250); } };
await settle();
for (const v of ['ent_out', 'ext_out', 'ent_in', 'ext_in']) { await settle(); await page.evaluate(`__app.skullView('${v}')`); await page.waitForTimeout(300); await page.screenshot({ path: shots + `/skullmodel-${tag}-${v}.png` }); }
fs.writeFileSync('logs.txt', logs.join('\n----\n'));
await browser.close();

