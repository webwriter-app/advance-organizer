/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { warnings, mount, reset, canvasOf, svgOf, view, dataOf, nodeEl, center, fire, dragOn, wheel, key, must, near, zoomLabel, zoomButton, click, closePage, openPage, settle, frame, until } from "./helpers";

mocha.setup(getMochaConfig());

describe("<webwriter-advance-organizer> in read mode", function () {
  this.timeout(20000);
  let w: any;

  before(async function () {
    w = await mount({ edit: false });
  });
  after(reset);

  describe("viewing", function () {
    it("renders three nodes and one edge without a toolbar", function () {
      must(canvasOf(w).shadowRoot.querySelectorAll("[data-item-id]").length === 4, "item count");
      must(!w.shadowRoot.querySelector("ao-toolbar"), "toolbar present");
    });
    it("keeps authored data and unknown keys in the block", function () {
      const d = dataOf(w);
      must(d.nodes.length === 3 && d.keep === "me", "block changed");
    });
    it("fits the content and shows the scale in the zoom label", function () {
      const v0 = view(w);
      must(v0.scale > 0 && v0.scale <= 1 && zoomLabel(w) === `${Math.round(v0.scale * 100)}%`, "fit or label");
    });
    it("zooms by 1.3 about the centre with the zoom in button", async function () {
      const before = view(w); const rect = svgOf(w).getBoundingClientRect();
      const sceneC = { x: (rect.width / 2 - before.x) / before.scale, y: (rect.height / 2 - before.y) / before.scale };
      click(zoomButton(w, "Zoom in")!); await settle(4);
      const after = view(w);
      const sceneC2 = { x: (rect.width / 2 - after.x) / after.scale, y: (rect.height / 2 - after.y) / after.scale };
      must(near(after.scale / before.scale, 1.3, 0.01) && near(sceneC.x, sceneC2.x, 0.5) && near(sceneC.y, sceneC2.y, 0.5) && zoomLabel(w) === `${Math.round(after.scale * 100)}%`, "zoom in");
    });
    it("returns to the fitted view with the fit button", async function () {
      click(zoomButton(w, "Fit to view")!); await settle(4);
      const a = view(w); const r = svgOf(w).getBoundingClientRect();
      const bw = 450, bh = 230; // node boxes of the data: x -80..370, y -110..120
      const expected = Math.min(4, Math.min((r.width - 64) / bw, (r.height - 64) / bh));
      const cx = (a.x * -1 + r.width / 2) / a.scale, cy = (r.height / 2 - a.y) / a.scale;
      must(near(a.scale, expected, 0.01) && near(cx, 145, 1) && near(cy, 5, 1), "fit");
    });
    it("disables zoom out at the minimum", async function () {
      for (let i = 0; i < 12; i++) { click(zoomButton(w, "Zoom out")!); await settle(2); }
      must(near(view(w).scale, 0.25, 0.005) && zoomButton(w, "Zoom out")!.hasAttribute("disabled"), "minimum");
    });
    it("zooms about the pointer on ctrl+wheel", async function () {
      click(zoomButton(w, "Fit to view")!); await settle(4);
      const rect = svgOf(w).getBoundingClientRect(); const px = rect.left + 200, py = rect.top + 150;
      const b = view(w); const world = { x: (200 - b.x) / b.scale, y: (150 - b.y) / b.scale };
      wheel(svgOf(w), { clientX: px, clientY: py, deltaY: -60, ctrlKey: true }); await settle(4);
      const a = view(w);
      must(a.scale > b.scale && near((200 - a.x) / a.scale, world.x, 0.5) && near((150 - a.y) / a.scale, world.y, 0.5), "ctrl+wheel");
    });
    it("pans on plain wheel and sideways on shift+wheel", async function () {
      const rect = svgOf(w).getBoundingClientRect(); const at = { clientX: rect.left + 50, clientY: rect.top + 50 };
      const b = view(w);
      wheel(svgOf(w), { ...at, deltaY: 20 }); await settle(3);
      const a = view(w);
      wheel(svgOf(w), { ...at, deltaY: 20, shiftKey: true }); await settle(3);
      const c = view(w);
      must(a.y < b.y && near(a.x, b.x, 0.5) && c.x < a.x && near(c.y, a.y, 0.5), "wheel pan");
    });
    it("limits panning to the content plus a margin", async function () {
      const rect = svgOf(w).getBoundingClientRect(); const at = { clientX: rect.left + 50, clientY: rect.top + 50 };
      for (let i = 0; i < 40; i++) wheel(svgOf(w), { ...at, deltaX: 300, deltaY: 0 });
      await settle(4);
      const a = view(w);
      for (let i = 0; i < 40; i++) wheel(svgOf(w), { ...at, deltaX: -300, deltaY: 0 });
      await settle(4);
      const b = view(w);
      must(a.x > -3000 && b.x < 3000 && b.x > a.x, "pan limit");
    });
    it("pans when the background is dragged", async function () {
      click(zoomButton(w, "Fit to view")!); await settle(4);
      const b = view(w); const rect = svgOf(w).getBoundingClientRect();
      const from = { clientX: rect.left + 40, clientY: rect.top + 40 };
      await dragOn(svgOf(w), from, { clientX: from.clientX + 20, clientY: from.clientY + 10 });
      const a = view(w); must(near(a.x - b.x, 20, 6) && near(a.y - b.y, 10, 6) && near(a.scale, b.scale, 0.001), () => JSON.stringify({ b, a }));
    });
    it("opens the page of a node when it is pressed", async function () {
      const el = nodeEl(w, "n2"); const at = center(el);
      fire(el, "pointerdown", at); await settle(3); fire(el, "pointerup", at); await settle(3);
      must(!!w.shadowRoot.querySelector("ao-page-info-actions") && !!w.shadowRoot.querySelector("slot[data-page]"), "page not open");
    });
    it("leaves the document alone when keys are pressed", async function () {
      const before = JSON.stringify(dataOf(w));
      w.shadowRoot.querySelector("ao-page-info-actions")?.dispatchEvent(new CustomEvent("close-page", { bubbles: true, composed: true })); await settle(3);
      key(svgOf(w), "Delete"); key(svgOf(w), "a", { ctrlKey: true }); key(svgOf(w), "c"); await settle(3);
      must(JSON.stringify(dataOf(w)) === before, "block changed");
    });
  });

  describe("navigation details", function () {
    before(async function () {
      w = await mount({ edit: false });
    });
    const hit = (x: number, y: number): any => canvasOf(w).shadowRoot.elementFromPoint(x, y);

    it("lets a press on a node without a page, an edge or an image through to the canvas, but not on a node with a page", function () {
      const n1 = center(nodeEl(w, "n3")), n2 = center(nodeEl(w, "n2"));
      const edge = canvasOf(w).shadowRoot.querySelector('.edges [data-item-id="e1"]'); const e = center(edge);
      must(hit(n1.clientX, n1.clientY) === svgOf(w), () => `n3 hit ${hit(n1.clientX, n1.clientY)?.tagName}`);
      must(!!hit(n2.clientX, n2.clientY).closest('[data-item-id="n2"]'), "n2 hit");
      must(!hit(e.clientX, e.clientY)?.closest?.("[data-item-id]"), "edge hit");
    });
    it("pans the view when a drag starts on a node without a page", async function () {
      const b = view(w); const from = center(nodeEl(w, "n3")); const target = hit(from.clientX, from.clientY);
      await dragOn(target, from, { clientX: from.clientX + 20, clientY: from.clientY + 10 });
      const a = view(w); must(near(a.x - b.x, 20, 6) && near(a.y - b.y, 10, 6), () => JSON.stringify({ a, b }));
    });
    it("zooms about the midpoint when two fingers pinch", async function () {
      click(zoomButton(w, "Fit to view")!); await settle(4);
      const rect = svgOf(w).getBoundingClientRect(); const c = { x: rect.left + 300, y: rect.top + 200 };
      const t = (id: number, x: number, y: number, type: string) => fire(svgOf(w), type, { clientX: x, clientY: y }, { pointerId: id, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      const b = view(w);
      t(31, c.x - 40, c.y, "pointerdown"); await frame();
      t(32, c.x + 40, c.y, "pointerdown"); await frame();
      for (let i = 1; i <= 5; i++) { t(31, c.x - 40 - i * 12, c.y, "pointermove"); t(32, c.x + 40 + i * 12, c.y, "pointermove"); await frame(); await frame(); }
      t(31, c.x - 100, c.y, "pointerup"); t(32, c.x + 100, c.y, "pointerup"); await settle(3);
      const a = view(w);
      must(a.scale > b.scale * 1.5, () => JSON.stringify({ a, b }));
    });
    it("keeps the view when a page is opened and closed", async function () {
      click(zoomButton(w, "Zoom in")!); await settle(4);
      const rect = svgOf(w).getBoundingClientRect();
      const at = { clientX: rect.left + 30, clientY: rect.top + 30 };
      wheel(svgOf(w), { ...at, deltaX: 30, deltaY: 20 }); await settle(3);
      const b = view(w);
      openPage(w); await until(() => !canvasOf(w), "page open");
      closePage(w);
      await until(() => canvasOf(w) && svgOf(w), "canvas back"); await settle(6);
      const a = view(w); must(near(a.scale, b.scale, 0.001) && near(a.x, b.x, 1) && near(a.y, b.y, 1), () => JSON.stringify({ a, b }));
    });
    it("still navigates after returning from a page", async function () {
      const b = view(w); wheel(svgOf(w), { clientX: svgOf(w).getBoundingClientRect().left + 50, clientY: svgOf(w).getBoundingClientRect().top + 50, deltaX: 10, deltaY: 0 }); await settle(3);
      must(view(w).x < b.x, "no pan");
    });
    it("shows no author actions in the page toolbar", async function () {
      openPage(w); await until(() => !canvasOf(w), "page open"); await settle(3);
      const actions = w.shadowRoot.querySelector("ao-page-edit-actions"); const hidden = !actions || getComputedStyle(actions).display === "none";
      closePage(w); await until(() => canvasOf(w), "back"); must(hidden, "visible to a reader");
    });
  });

  it("reports no warnings", function () {
    must(warnings.length === 0, () => warnings.join(" | "));
  });
});

mocha.run();
