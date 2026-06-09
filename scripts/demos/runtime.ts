import type { Page } from "playwright";
import { DEMO } from "./config";

/**
 * Demo runtime: wraps a Playwright Page with an on-brand presentation layer —
 * an animated fake cursor (Playwright's synthetic clicks show no OS cursor), a
 * caption bar describing each action, intro/section title cards, and click
 * pulses. Everything is injected DOM, so it records into the video natively.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const OVERLAY_JS = `(() => {
  if (document.getElementById('demo-overlay')) return;
  const o = document.createElement('div');
  o.id = 'demo-overlay';
  o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif;';
  o.innerHTML = \`
    <div id="demo-cursor" style="position:fixed;left:-100px;top:-100px;width:28px;height:28px;transition:left .7s cubic-bezier(.22,.61,.36,1),top .7s cubic-bezier(.22,.61,.36,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));z-index:3;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 7-6 1.5L10.5 18 5 3z" fill="#fff" stroke="#0b1220" stroke-width="1.3" stroke-linejoin="round"/></svg>
    </div>
    <div id="demo-pulse" style="position:fixed;left:-100px;top:-100px;width:20px;height:20px;border-radius:50%;background:rgba(45,212,191,.5);transform:translate(-50%,-50%) scale(0);transition:transform .35s ease,opacity .35s ease;opacity:0;z-index:2;"></div>
    <div id="demo-caption-wrap" style="position:fixed;left:0;right:0;bottom:34px;display:flex;justify-content:center;z-index:4;opacity:0;transition:opacity .3s ease;">
      <div id="demo-caption" style="max-width:74%;background:rgba(10,16,28,.92);color:#fff;border:1px solid rgba(45,212,191,.45);border-radius:12px;padding:12px 20px;font-size:18px;font-weight:500;line-height:1.35;box-shadow:0 8px 30px rgba(0,0,0,.45);backdrop-filter:blur(4px);"></div>
    </div>
    <div id="demo-title" style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(120% 120% at 50% 0%,#0b1f33 0%,#070d18 60%);z-index:9;opacity:0;transition:opacity .45s ease;pointer-events:none;">
      <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#2dd4bf;font-weight:600;">Vantage by intelle.io</div>
      <div id="demo-title-h" style="font-size:46px;font-weight:700;color:#fff;text-align:center;max-width:80%;"></div>
      <div id="demo-title-s" style="font-size:19px;color:#9fb3c8;text-align:center;max-width:70%;"></div>
    </div>\`;
  document.body.appendChild(o);
})();`;

export class Demo {
  constructor(public page: Page) {}

  private async ensureOverlay() {
    await this.page.evaluate(OVERLAY_JS).catch(() => {});
  }

  async goto(path: string, caption?: string) {
    const url = path.startsWith("http") ? path : `${DEMO.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.ensureOverlay();
    await sleep(DEMO.pace.afterNav);
    if (caption) await this.caption(caption);
  }

  async caption(text: string, holdMs: number = DEMO.pace.caption) {
    await this.ensureOverlay();
    await this.page.evaluate((t) => {
      const wrap = document.getElementById("demo-caption-wrap");
      const cap = document.getElementById("demo-caption");
      if (cap) cap.textContent = t;
      if (wrap) wrap.style.opacity = "1";
    }, text);
    await sleep(holdMs);
  }

  async hideCaption() {
    await this.page.evaluate(() => {
      const wrap = document.getElementById("demo-caption-wrap");
      if (wrap) wrap.style.opacity = "0";
    });
  }

  async titleCard(title: string, subtitle = "") {
    await this.ensureOverlay();
    await this.page.evaluate(
      ({ title, subtitle }) => {
        const t = document.getElementById("demo-title");
        const h = document.getElementById("demo-title-h");
        const s = document.getElementById("demo-title-s");
        if (h) h.textContent = title;
        if (s) s.textContent = subtitle;
        if (t) t.style.opacity = "1";
      },
      { title, subtitle },
    );
    await sleep(DEMO.pace.titleCard);
    await this.page.evaluate(() => {
      const t = document.getElementById("demo-title");
      if (t) t.style.opacity = "0";
    });
    await sleep(500);
  }

  private async center(selector: string) {
    const loc = this.page.locator(selector).first();
    await loc.waitFor({ state: "visible", timeout: 15000 });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const box = await loc.boundingBox();
    if (!box) throw new Error(`no box for ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, loc };
  }

  async moveTo(selector: string) {
    await this.ensureOverlay();
    const { x, y } = await this.center(selector);
    await this.page.evaluate(
      ({ x, y }) => {
        const c = document.getElementById("demo-cursor");
        if (c) {
          c.style.left = x - 4 + "px";
          c.style.top = y - 2 + "px";
        }
      },
      { x, y },
    );
    await this.page.mouse.move(x, y);
    await sleep(DEMO.pace.cursorMove);
    return { x, y };
  }

  private async pulse(x: number, y: number) {
    await this.page.evaluate(
      ({ x, y }) => {
        const p = document.getElementById("demo-pulse");
        if (!p) return;
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.transition = "none";
        p.style.opacity = "1";
        p.style.transform = "translate(-50%,-50%) scale(0)";
        void p.offsetWidth;
        p.style.transition = "transform .4s ease,opacity .4s ease";
        p.style.transform = "translate(-50%,-50%) scale(3)";
        p.style.opacity = "0";
      },
      { x, y },
    );
  }

  async click(selector: string, caption?: string) {
    if (caption) await this.caption(caption, 900);
    const { x, y, loc } = await this.center(selector);
    await this.moveTo(selector);
    await this.pulse(x, y);
    await loc.click().catch(async () => {
      await this.page.mouse.click(x, y);
    });
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.ensureOverlay();
    await sleep(DEMO.pace.afterClick);
  }

  async type(selector: string, text: string, caption?: string) {
    if (caption) await this.caption(caption, 800);
    await this.moveTo(selector);
    const loc = this.page.locator(selector).first();
    await loc.click().catch(() => {});
    await loc.fill("").catch(() => {});
    await loc.pressSequentially(text, { delay: DEMO.pace.typeDelay });
    await sleep(700);
  }

  async wait(ms: number) {
    await sleep(ms);
  }

  async scroll(px: number) {
    await this.page.mouse.wheel(0, px);
    await sleep(800);
  }

  async login() {
    await this.page.goto(`${DEMO.baseUrl}/regwatch/login`, { waitUntil: "networkidle" });
    // Let React hydrate first — filling a controlled input before hydration
    // makes it reset to empty on the first client render.
    await sleep(1300);
    const email = this.page.locator('input[type="email"]').first();
    const pw = this.page.locator('input[type="password"]').first();
    await email.click();
    await email.fill(DEMO.email);
    if ((await email.inputValue()) !== DEMO.email) {
      await email.fill("");
      await email.pressSequentially(DEMO.email, { delay: 25 });
    }
    await pw.fill(DEMO.password);
    if ((await pw.inputValue()) !== DEMO.password) {
      await pw.fill("");
      await pw.pressSequentially(DEMO.password, { delay: 25 });
    }
    await this.page.getByRole("button", { name: /^sign in$/i }).first().click();
    await this.page.waitForURL(/\/regwatch\/(feed|monitor|onboarding|comply|assets|documents)/, { timeout: 25000 }).catch(() => {});
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await sleep(900);
  }
}
