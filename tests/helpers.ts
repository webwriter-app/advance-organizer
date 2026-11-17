import "../src/widgets/webwriter-advance-organizer";
import "../src/widgets/webwriter-advance-organizer-page";

export const warnings: string[] = [];
const warn = console.warn;
console.warn = (...parts: unknown[]) => {
  warnings.push(parts.map(String).join(" ").slice(0, 300));
  warn(...parts);
};

// Synthetic pointer events have no active pointer, so the browser refuses to capture them. The page
// ignores that; an uncaught error would fail the running test.
for (const name of ["setPointerCapture", "releasePointerCapture"] as const) {
  const original = Element.prototype[name];
  Element.prototype[name] = function (this: Element, id: number) {
    try { original.call(this, id); } catch (error) { if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error; }
  };
}

const style = document.createElement("style");
style.textContent = "webwriter-advance-organizer { display: block; width: 800px; height: 480px; }";
document.head.append(style);

export const mountPoint = document.createElement("div");
document.body.append(mountPoint);

export const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
export const until = async <T>(fn: () => T | Promise<T>, message = "condition not met", timeout = 5000): Promise<T> => {
  const end = performance.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (performance.now() > end) throw new Error(message);
    await new Promise((r) => setTimeout(r, 25));
  }
};
export const settle = async (n = 3) => { for (let i = 0; i < n; i++) await frame(); };

const DATA = {
  nodes: [
    { id: "n1", kind: "node", position: { x: 0, y: 0 }, dimension: { width: 160, height: 60 }, style: { preset: "main-topic" }, label: { text: "A" } },
    { id: "n2", kind: "node", position: { x: 300, y: -80 }, dimension: { width: 140, height: 60 }, style: { shape: "ellipse" }, label: { text: "B" } },
    { id: "n3", kind: "node", position: { x: 300, y: 90 }, dimension: { width: 140, height: 60 }, style: { fill: "#ffffff", stroke: "#333333" }, label: { text: "C" } },
  ],
  edges: [{ id: "e1", kind: "edge", source: "n1", sourcePosition: "right", target: "n2", targetPosition: "left", style: { markerEnd: "arrow" } }],
  images: [],
};
const extraKey = { keep: "me" };

export async function mount({ edit, lang, extra = true }: { edit: boolean | "fake"; lang?: string; extra?: boolean }): Promise<any> {
  mountPoint.innerHTML = "";
  document.designMode = edit === true ? "on" : "off";
  const w: any = document.createElement("webwriter-advance-organizer");
  if (lang) w.setAttribute("lang", lang);
  const script = document.createElement("script");
  script.type = "application/json"; script.slot = "data";
  script.textContent = JSON.stringify(extra ? { ...DATA, ...extraKey } : DATA);
  w.append(script);
  const page = document.createElement("webwriter-advance-organizer-page");
  page.setAttribute("node-id", "n2"); page.innerHTML = "<p>page</p>";
  w.append(page);
  if (edit === true) w.setAttribute("contenteditable", "");
  // "fake": the host reports edit mode, but nothing inside the shadow tree is contenteditable.
  if (edit === "fake") Object.defineProperty(w, "isContentEditable", { get: () => true, configurable: true });
  mountPoint.append(w);
  await w.updateComplete;
  const canvas: any = await until(() => w.shadowRoot.querySelector("ao-canvas"), "canvas");
  await canvas.updateComplete;
  await until(() => canvas.shadowRoot.querySelectorAll("[data-item-id]").length >= 3, "items");
  await settle(5);
  return w;
}

export function reset() {
  mountPoint.innerHTML = "";
  document.designMode = "off";
  document.documentElement.removeAttribute("lang");
}

export const canvasOf = (w: any): any => w.shadowRoot.querySelector("ao-canvas");
export const svgOf = (w: any): SVGSVGElement => canvasOf(w).shadowRoot.querySelector("svg");
const gOf = (w: any): SVGGElement => svgOf(w).querySelector("g.viewport")!;
export const view = (w: any) => {
  const m = gOf(w).getScreenCTM()!; const r = svgOf(w).getBoundingClientRect();
  return { scale: m.a, x: m.e - r.left, y: m.f - r.top };
};
export const dataOf = (w: any): any => JSON.parse(w.querySelector(':scope > script[slot="data"]').textContent);
export const nodeEl = (w: any, id: string): Element => canvasOf(w).shadowRoot.querySelector(`[data-item-id="${id}"]`);
export const center = (el: Element) => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; };
export const fire = (el: Element, type: string, pos: object, init: object = {}) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, ...pos, ...init }));
export const mouse = (el: Element, type: string, pos: object, init: object = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, button: 0, buttons: type === "mouseup" ? 0 : 1, view: window, ...pos, ...init }));
type Pos = { clientX: number; clientY: number };
// A real mouse sends pointer events and, unless the press was claimed, the matching mouse events.
export async function dragOn(target: Element, from: Pos, to: Pos, init: object = {}) {
  const down = fire(target, "pointerdown", from, init); if (down) mouse(target, "mousedown", from, init); await frame();
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const at = { clientX: from.clientX + (to.clientX - from.clientX) * i / steps, clientY: from.clientY + (to.clientY - from.clientY) * i / steps };
    fire(target, "pointermove", at, init); mouse(target, "mousemove", at, init);
    await frame();
  }
  fire(target, "pointerup", to, init); mouse(target, "mouseup", to, init); await frame(); await frame();
}
export const wheel = (el: Element, init: object) => el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, composed: true, cancelable: true, ...init }));
export const key = (el: Element, k: string, init: object = {}) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true, cancelable: true, ...init }));
export const must = (ok: unknown, info: string | (() => string)) => { if (!ok) throw new Error(typeof info === "function" ? info() : String(info)); return true; };
export const near = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;
export const zoomLabel = (w: any) => canvasOf(w).shadowRoot.querySelector("ao-zoom-controls").shadowRoot.querySelector(".zoom-level").textContent.trim();
export const zoomButtons = (w: any): Element[] => [...canvasOf(w).shadowRoot.querySelector("ao-zoom-controls").shadowRoot.querySelectorAll("sl-icon-button")];
export const zoomButton = (w: any, label: string) => zoomButtons(w).find((b) => b.getAttribute("label") === label);
export const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
export const closePage = (w: any) => w.shadowRoot.querySelector("ao-page-info-actions").dispatchEvent(new CustomEvent("close-page", { bubbles: true, composed: true }));
export const openPage = (w: any, pageId = "n2") => canvasOf(w).dispatchEvent(new CustomEvent("open-page", { detail: { pageId }, bubbles: true, composed: true }));
