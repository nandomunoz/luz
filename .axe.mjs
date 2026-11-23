import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const b = await chromium.launch();
for (const [url, scheme, js, w] of [['/ai/','light',true,1280],['/es/ai/','dark',true,1280],['/ar/ai/','light',true,1280],['/ai/','light',false,1280],['/ai/','light',true,320]]) {
  const c = await b.newContext({ colorScheme: scheme, javaScriptEnabled: js, viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  const p = await c.newPage();
  await p.goto('http://127.0.0.1:5173' + url, { waitUntil: 'networkidle' });
  const r = await new AxeBuilder({ page: p }).analyze();
  console.log(url, scheme, js ? 'js' : 'nojs', w, r.violations.map(v => `${v.id}: ${v.nodes.map(n=>n.target.join(' ')).slice(0,3).join(' | ')}`), 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  await c.close();
}
await b.close();
