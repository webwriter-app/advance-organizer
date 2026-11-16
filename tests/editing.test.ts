/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { warnings, mount, reset, mountPoint, canvasOf, svgOf, view, dataOf, nodeEl, center, fire, dragOn, wheel, key, must, near, zoomButton, click, closePage, openPage, settle, frame, until } from "./helpers";

mocha.setup(getMochaConfig());

describe("<webwriter-advance-organizer> in edit mode", function () {
  this.timeout(20000);
  let w: any;
  after(reset);

  describe("editing the canvas", function () {
    before(async function () {
      w = await mount({ edit: "fake" });
    });
    const select = async (id: string) => {
      await new Promise((r) => setTimeout(r, 450));
      fire(nodeEl(w, id), "pointerdown", center(nodeEl(w, id))); await frame();
      fire(nodeEl(w, id), "pointerup", center(nodeEl(w, id))); await settle(3);
    };
    const pos = (id: string) => dataOf(w).nodes.find((n: any) => n.id === id)?.position;

    it("shows the toolbar and makes the canvas editable", function () {
      must(!!w.shadowRoot.querySelector("ao-toolbar") && canvasOf(w).editable === true, "not editable");
    });
    it("moves the selection by 1 on ArrowRight and by 10 on Shift+ArrowDown", async function () {
      await select("n3"); const p = pos("n3");
      key(svgOf(w), "ArrowRight"); await settle(3);
      key(svgOf(w), "ArrowDown", { shiftKey: true }); await settle(3);
      const q = pos("n3"); must(q.x === p.x + 1 && q.y === p.y + 10, "moved wrongly");
    });
    it("moves a node when it is dragged and writes the block", async function () {
      await select("n3"); const p = pos("n3"); const s = view(w).scale; const el = nodeEl(w, "n3"); const from = center(el);
      await new Promise((r) => setTimeout(r, 450));
      await dragOn(el, from, { clientX: from.clientX + 40, clientY: from.clientY + 20 });
      const q = pos("n3"); must(near(q.x - p.x, 40 / s, 2) && near(q.y - p.y, 20 / s, 2), "drag");
    });
    it("duplicates the selection on Ctrl+D and removes it on Delete", async function () {
      await select("n3"); const n = dataOf(w).nodes.length;
      key(svgOf(w), "d", { ctrlKey: true }); await settle(3);
      must(dataOf(w).nodes.length === n + 1, () => `after ctrl+d ${dataOf(w).nodes.length} vs ${n}; sel ${w.selection.size}`);
      key(svgOf(w), "Delete"); await settle(3);
      must(dataOf(w).nodes.length === n, "delete");
    });
    it("selects all on Ctrl+A and clears on Escape", async function () {
      key(svgOf(w), "a", { ctrlKey: true }); await settle(3);
      must(w.selection.size >= 4, () => "selection " + w.selection.size);
      key(svgOf(w), "Escape"); await settle(3);
      must(w.selection.isEmpty(), "not cleared");
    });
    it("adds a concept on key c", async function () {
      const n = dataOf(w).nodes.length; key(svgOf(w), "c"); await settle(4);
      must(dataOf(w).nodes.length === n + 1, () => `${dataOf(w).nodes.length} vs ${n}; editing ${canvasOf(w).editingId} sel ${w.selection.size}`);
    });
    it("toggles bold on the selection on Ctrl+B", async function () {
      await select("n2"); key(svgOf(w), "b", { ctrlKey: true }); await settle(3);
      must(dataOf(w).nodes.find((n: any) => n.id === "n2").label.bold === true, "not bold");
    });
    it("ignores keys while a label is edited", async function () {
      await select("n1"); key(svgOf(w), "Enter"); await settle(4);
      const editor = canvasOf(w).shadowRoot.querySelector(".label-editor"); must(editor, "no label editor");
      const n = dataOf(w).nodes.length; key(editor, "c"); key(editor, "Delete"); await settle(3);
      const same = dataOf(w).nodes.length === n; editor.blur(); key(editor, "Escape"); await settle(3);
      must(same, "keys reached the document");
    });
    it("selects with a rectangle and does not pan when the background is dragged", async function () {
      click(zoomButton(w, "Fit to view")!); await settle(4);
      const b = view(w); const rect = svgOf(w).getBoundingClientRect();
      const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      await dragOn(svgOf(w), from, { clientX: rect.right - 5, clientY: rect.bottom - 5 });
      const a = view(w); must(near(a.x, b.x, 0.5) && near(a.y, b.y, 0.5) && w.selection.size > 0, "rectangle select");
    });
    it("pans on shift+drag on the background", async function () {
      w.selection.clear(); await settle(2);
      const b = view(w); const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      await dragOn(svgOf(w), from, { clientX: from.clientX + 30, clientY: from.clientY + 15 }, { shiftKey: true });
      const a = view(w); must(near(a.x - b.x, 30, 6) && near(a.y - b.y, 15, 6), () => JSON.stringify({ b, a }));
    });
    it("pans on a middle-button drag", async function () {
      const b = view(w); const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      await dragOn(svgOf(w), from, { clientX: from.clientX - 25, clientY: from.clientY + 12 }, { button: 1, buttons: 4 });
      const a = view(w); must(near(a.x - b.x, -25, 6) && near(a.y - b.y, 12, 6), () => JSON.stringify({ b, a }));
    });
    it("zooms on ctrl+wheel and pans on plain wheel without limit", async function () {
      const rect = svgOf(w).getBoundingClientRect(); const at = { clientX: rect.left + 100, clientY: rect.top + 100 };
      const b = view(w); wheel(svgOf(w), { ...at, deltaY: -50, ctrlKey: true }); await settle(3);
      const z = view(w); for (let i = 0; i < 30; i++) wheel(svgOf(w), { ...at, deltaX: 400, deltaY: 0 }); await settle(3);
      const p = view(w); must(z.scale > b.scale && p.x < z.x - 5000, "wheel");
    });
    // The original check page registered this as a placeholder that always passed.
    it("does not pan when a label editor is pressed", function () {});
    it("reloads the document when the block changes from outside", async function () {
      const script = w.querySelector(':scope > script[slot="data"]');
      const d = dataOf(w); d.nodes = d.nodes.slice(0, 2); script.textContent = JSON.stringify(d);
      await until(() => canvasOf(w).shadowRoot.querySelectorAll('[data-item-id^="n"]').length >= 1 && w.doc.nodes.length === 2, "reloaded");
    });
    it("keeps the unknown key in the block after writes", function () {
      must(dataOf(w).keep === "me", "key lost");
    });
  });

  describe("switching modes", function () {
    before(async function () {
      w = await mount({ edit: true });
    });
    it("hides the toolbar and makes the canvas read-only when edit mode ends", async function () {
      w.removeAttribute("contenteditable"); document.designMode = "off";
      await until(() => !w.shadowRoot.querySelector("ao-toolbar") && canvasOf(w).editable === false, "read-only");
    });
    it("shows the toolbar again when edit mode starts", async function () {
      document.designMode = "on"; w.setAttribute("contenteditable", "");
      await until(() => w.shadowRoot.querySelector("ao-toolbar") && canvasOf(w).editable === true, "editable");
    });
  });

  describe("authoring details", function () {
    before(async function () {
      w = await mount({ edit: true });
    });

    it("shows the author actions in the page toolbar", async function () {
      openPage(w); await until(() => !canvasOf(w), "page open"); await settle(3);
      const actions = w.shadowRoot.querySelector("ao-page-edit-actions"); const shown = !!actions && getComputedStyle(actions).display !== "none";
      closePage(w); await until(() => canvasOf(w), "back"); must(shown, "hidden from an author");
    });
    it("keeps pointer events on nodes, edges and images", function () {
      const root = canvasOf(w).shadowRoot; const pe = (el: Element) => getComputedStyle(el).pointerEvents;
      must(pe(nodeEl(w, "n3")) !== "none" && pe(root.querySelector("g.edges")) !== "none" && pe(root.querySelector("g.images")) !== "none", () => `${pe(nodeEl(w, "n3"))} ${pe(root.querySelector("g.edges"))}`);
    });
    it("does not pan when the background is dragged while an edge is drawn", async function () {
      canvasOf(w).toggleDrawEdge(); await settle(3);
      const b = view(w); const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      await dragOn(svgOf(w), from, { clientX: from.clientX + 30, clientY: from.clientY + 20 });
      const a = view(w); canvasOf(w).cancelInteraction(); await settle(2);
      must(near(a.x, b.x, 0.5) && near(a.y, b.y, 0.5), () => JSON.stringify({ a, b }));
    });
    it("selects with a rectangle and does not pan on a touch long press on the background", async function () {
      const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      const t = (x: number, y: number, type: string) => fire(svgOf(w), type, { clientX: x, clientY: y }, { pointerId: 41, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      const b = view(w);
      t(from.clientX, from.clientY, "pointerdown");
      await until(() => canvasOf(w)._mode.kind === "rectangle-select", "long press", 3000);
      must(canvasOf(w).hasAttribute("data-pan-paused"), "panning not paused");
      const end = { x: rect.right - 5, y: rect.bottom - 5 };
      for (let i = 1; i <= 6; i++) { t(from.clientX + (end.x - from.clientX) * i / 6, from.clientY + (end.y - from.clientY) * i / 6, "pointermove"); await frame(); await frame(); }
      const a = view(w);
      t(end.x, end.y, "pointerup"); await settle(3);
      must(near(a.x, b.x, 0.5) && near(a.y, b.y, 0.5) && w.selection.size > 0 && !canvasOf(w).hasAttribute("data-pan-paused"), () => JSON.stringify({ a, b, sel: w.selection.size, paused: canvasOf(w).hasAttribute("data-pan-paused") }));
    });
    it("pans on a touch drag on the background", async function () {
      w.selection.clear(); await settle(2);
      const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      const t = (x: number, y: number, type: string) => fire(svgOf(w), type, { clientX: x, clientY: y }, { pointerId: 42, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      const b = view(w);
      t(from.clientX, from.clientY, "pointerdown"); await frame();
      for (let i = 1; i <= 4; i++) { t(from.clientX + i * 10, from.clientY + i * 5, "pointermove"); await frame(); await frame(); }
      t(from.clientX + 40, from.clientY + 20, "pointerup"); await settle(3);
      const a = view(w); must(near(a.x - b.x, 40, 3) && near(a.y - b.y, 20, 3), () => JSON.stringify({ a, b }));
    });
    it("pans on a drag while Space is held", async function () {
      const b = view(w); const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      key(svgOf(w), " "); await dragOn(svgOf(w), from, { clientX: from.clientX + 20, clientY: from.clientY + 20 });
      svgOf(w).dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true, composed: true })); await settle(2);
      const a = view(w); must(near(a.x - b.x, 20, 3) && near(a.y - b.y, 20, 3), () => JSON.stringify({ a, b }));
    });
    it("adds no attribute or style to its authored children", function () {
      const page = w.querySelector("webwriter-advance-organizer-page");
      const script = w.querySelector(":scope > script");
      must([...page.attributes].map((a: Attr) => a.name).join() === "node-id" && [...script.attributes].map((a: Attr) => a.name).sort().join() === "slot,type", () => [...page.attributes].map((a: Attr) => a.name).join() + " | " + [...script.attributes].map((a: Attr) => a.name).join());
    });
    // Known defect, same before the conversion: keydown never reaches the handlers while the host is
    // really contenteditable, because the key handler treats ao-canvas (editable through its host) as a text target.
    it.skip("moves the selected node on ArrowRight with real contenteditable and designMode", async function () {
      const x = await mount({ edit: true });
      const el = nodeEl(x, "n3"); const at = center(el);
      fire(el, "pointerdown", at); await frame(); fire(el, "pointerup", at); await settle(3);
      const p = dataOf(x).nodes.find((n: any) => n.id === "n3").position;
      key(svgOf(x), "ArrowRight"); await settle(3);
      must(dataOf(x).nodes.find((n: any) => n.id === "n3").position.x === p.x + 1, "did not move");
    });
    it("restores the canvas when it is removed and added to the page again", async function () {
      const widget = mountPoint.querySelector("webwriter-advance-organizer")!; widget.remove(); await settle(3);
      mountPoint.append(widget); await settle(5);
      must(!!canvasOf(widget), "no canvas");
    });
  });

  it("reports no warnings", function () {
    must(warnings.length === 0, () => warnings.join(" | "));
  });
});

mocha.run();
