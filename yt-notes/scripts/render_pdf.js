// Render an HTML file to an A4 PDF with a source link and page numbers in every footer.
// Usage: node render_pdf.js input.html output.pdf [--max N] [--source URL]
// Prints PAGES, WORDS and READ_MIN (at 220 words per minute). With --max it prints OVER_LIMIT when too long.
// Uses the browser already on the machine (Edge, then Chrome), so nothing big is downloaded.
// One-time setup:  npm i -g playwright-core@1.63.0      (a few MB, no browser download)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function load() {
  // Load playwright-core only from the global npm folder. Never from the current folder: the skill runs this
  // script from its work folder, where Claude can write files, so a planted node_modules there must not load.
  // npm runs from this script's own folder for the same reason (on Windows, cmd.exe looks in the current
  // folder before PATH).
  let root = '';
  try { root = execSync('npm root -g', { cwd: __dirname }).toString().trim(); } catch (e) {}
  for (const mod of ['playwright-core', 'playwright']) {
    try { if (root) return require(path.join(root, mod)); } catch (e) {}
  }
  console.error('MISSING_PLAYWRIGHT: run  npm i -g playwright-core@1.63.0  and retry.');
  process.exit(1);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

(async () => {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const max = Number(flag('--max')) || 0;
  const source = flag('--source') || '';
  const [input, output = 'notes.pdf'] = args;
  if (!input) { console.error('Usage: node render_pdf.js input.html output.pdf [--max N] [--source URL]'); process.exit(1); }
  const { chromium } = load();

  let browser, used;
  for (const channel of ['msedge', 'chrome', undefined]) {
    try { browser = await chromium.launch(channel ? { channel } : {}); used = channel || 'bundled chromium'; break; }
    catch (e) {}
  }
  if (!browser) { console.error('NO_BROWSER: install Edge or Chrome, then retry.'); process.exit(1); }

  // The notes HTML is written from untrusted text (transcripts, web pages). So while printing, page scripts are
  // off, and only local files may load: an injected <img src="https://..."> must not reach the network.
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const abs = path.resolve(input).replace(/\\/g, '/');
  await page.goto('file://' + (abs.startsWith('/') ? '' : '/') + abs);
  const words = await page.evaluate(() => (document.body.innerText.match(/\S+/g) || []).length);
  const src = source ? `Source: <a href="${esc(source)}" style="color:#1f4e8c;text-decoration:none">${esc(source)}</a> · ` : '';
  await page.pdf({
    path: output, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:7pt;color:#8a94a3;width:100%;text-align:center;">${src}page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });
  await browser.close();

  const pages = (fs.readFileSync(output, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const readMin = Math.max(1, Math.round(words / 220));
  console.log(`OK ${output} (rendered with ${used}) PAGES=${pages} WORDS=${words} READ_MIN=${readMin}` + (max ? ` MAX=${max}` : ''));
  if (max && pages > max) console.log(`OVER_LIMIT: ${pages - max} page(s) too many. Trim or merge sections and render again.`);
  if (!source) console.log('NO_SOURCE: pass --source <video URL> so every page footer links to the original.');
})();
