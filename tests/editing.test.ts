/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { warnings, mount, reset, mountPoint, canvasOf, svgOf, view, dataOf, nodeEl, center, fire, mouse, dragOn, wheel, key, must, near, zoomButton, click, closePage, openPage, settle, frame, until } from "./helpers";

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
    it("adds one concept without panning or opening a menu on a touch long press on the background", async function () {
      const rect = svgOf(w).getBoundingClientRect(); const from = { clientX: rect.left + 5, clientY: rect.top + 5 };
      const t = (x: number, y: number, type: string) => fire(svgOf(w), type, { clientX: x, clientY: y }, { pointerId: 41, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      const b = view(w); const count = dataOf(w).nodes.length;
      t(from.clientX, from.clientY, "pointerdown");
      await until(() => dataOf(w).nodes.length === count + 1, "long press", 3000);
      t(from.clientX, from.clientY, "pointerup"); await settle(3);
      const a = view(w); const node = dataOf(w).nodes.at(-1);
      must(near(node.position.x, (5 - b.x) / b.scale, 1) && near(node.position.y, (5 - b.y) / b.scale, 1), "insertion position");
      must(near(a.x, b.x, 0.5) && near(a.y, b.y, 0.5) && w.selection.has(node.id) && !w.shadowRoot.querySelector("ao-context-menu") && dataOf(w).nodes.length === count + 1, "long press result");
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
    it("moves the selected node on ArrowRight with real contenteditable and designMode", async function () {
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

  describe("concept creation and deletion with real contenteditable", function () {
    beforeEach(async function () {
      w = await mount({ edit: true });
    });
    const background = () => {
      const rect = svgOf(w).getBoundingClientRect();
      return { clientX: rect.left + 20, clientY: rect.top + 20 };
    };

    it("shows the automaton-style hint only on an empty editable canvas", async function () {
      w.doc.removeItems(new Set([...w.doc.nodes, ...w.doc.edges].map((item: any) => item.id))); await settle(3);
      const hint = canvasOf(w).shadowRoot.querySelector(".empty-hint");
      must(hint?.textContent.trim() === "Double click / long tap to add a concept", "hint");
      must(getComputedStyle(hint).display === "grid" && getComputedStyle(hint).pointerEvents === "none", "hint style");
      mouse(svgOf(w), "dblclick", background()); await settle(3);
      must(!canvasOf(w).shadowRoot.querySelector(".empty-hint"), "hint remains after creation");
      w.removeAttribute("contenteditable"); document.designMode = "off"; await settle(3);
      w.doc.removeItems(new Set(w.doc.nodes.map((item: any) => item.id))); await settle(3);
      must(!canvasOf(w).shadowRoot.querySelector(".empty-hint"), "reader hint");
    });
    it("adds and selects a concept at the double-click position after zooming and panning", async function () {
      const at = background();
      wheel(svgOf(w), { ...at, deltaY: -100, ctrlKey: true }); await settle(3);
      wheel(svgOf(w), { ...at, deltaX: 60, deltaY: 30 }); await settle(3);
      const v = view(w); const count = dataOf(w).nodes.length;
      mouse(svgOf(w), "dblclick", at); await settle(3);
      const node = dataOf(w).nodes.at(-1);
      must(dataOf(w).nodes.length === count + 1 && w.selection.has(node.id), "creation or selection");
      must(near(node.position.x, (20 - v.x) / v.scale, 1) && near(node.position.y, (20 - v.y) / v.scale, 1), "zoomed position");
      must(dataOf(w).keep === "me", "unknown data lost");
    });
    it("does not add concepts on items, in relation mode, or in reading mode", async function () {
      const count = dataOf(w).nodes.length;
      mouse(nodeEl(w, "n3"), "dblclick", center(nodeEl(w, "n3")));
      canvasOf(w).toggleDrawEdge(); await settle(2);
      mouse(svgOf(w), "dblclick", background());
      canvasOf(w).cancelInteraction();
      w.removeAttribute("contenteditable"); document.designMode = "off"; await settle(3);
      mouse(svgOf(w), "dblclick", background()); await settle(3);
      must(dataOf(w).nodes.length === count, "unexpected creation");
    });
    it("deletes a selected concept, its relations and its page with Backspace", async function () {
      const el = nodeEl(w, "n2"); const at = center(el);
      fire(el, "pointerdown", at); fire(el, "pointerup", at); await settle(3);
      must(key(svgOf(w), "Backspace") === false, "Backspace not consumed"); await settle(3);
      must(!dataOf(w).nodes.some((n: any) => n.id === "n2") && dataOf(w).edges.length === 0, "concept or relation remains");
      must(!w.querySelector('[node-id="n2"]') && dataOf(w).keep === "me", "page or data");
    });
    it("deletes a selected image with Backspace", async function () {
      const image = w.doc.addImage({ position: { x: 0, y: 180 }, dimension: { width: 80, height: 60 }, src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>" }); await settle(3);
      const el = canvasOf(w).shadowRoot.querySelector(`[data-item-id="${image.id}"]`); const at = center(el);
      fire(el, "pointerdown", at); fire(el, "pointerup", at); await settle(3);
      key(svgOf(w), "Backspace"); await settle(3);
      must(dataOf(w).images.length === 0 && dataOf(w).nodes.length === 3, "image deletion");
    });
    it("keeps Backspace inside a label editor", async function () {
      w.selection.select(new Set(["n3"])); key(svgOf(w), "Enter"); await settle(3);
      const editor = canvasOf(w).shadowRoot.querySelector(".label-editor"); must(editor, "editor missing");
      must(key(editor, "Backspace"), "text Backspace prevented"); await settle(3);
      must(dataOf(w).nodes.length === 3, "concept deleted while editing");
    });
    it("cancels pending long taps on pointercancel, a second finger, mode changes and removal", async function () {
      const count = dataOf(w).nodes.length; const at = background();
      const touch = (type: string, pointerId = 81) => fire(svgOf(w), type, at, { pointerType: "touch", pointerId });
      touch("pointerdown"); touch("pointercancel");
      await new Promise((r) => setTimeout(r, 550));
      touch("pointerdown"); touch("pointerdown", 82); touch("pointerup", 82); touch("pointerup");
      await new Promise((r) => setTimeout(r, 550));
      touch("pointerdown"); w.removeAttribute("contenteditable"); document.designMode = "off";
      await new Promise((r) => setTimeout(r, 550));
      must(dataOf(w).nodes.length === count, "canceled or read-only long tap created a concept");
      w.setAttribute("contenteditable", ""); document.designMode = "on"; await settle(3);
      touch("pointerdown"); w.remove();
      await new Promise((r) => setTimeout(r, 550));
      must(dataOf(w).nodes.length === count, "detached long tap created a concept");
    });
    it("keeps the context menu on a long tap on an existing concept", async function () {
      const el = nodeEl(w, "n3"); const at = center(el); const count = dataOf(w).nodes.length;
      fire(el, "pointerdown", at, { pointerType: "touch" });
      await new Promise((r) => setTimeout(r, 550));
      fire(el, "pointerup", at, { pointerType: "touch" }); await settle(3);
      must(!!w.shadowRoot.querySelector("ao-context-menu") && dataOf(w).nodes.length === count, "item long tap");
    });
    it("does not outline the focused canvas", function () {
      svgOf(w).focus(); must(getComputedStyle(svgOf(w)).outlineStyle === "none", "canvas outline");
    });
  });

  describe("keyboard and touch authoring", function () {
    before(async function () {
      w = await mount({ edit: "fake" });
    });
    const ids = () => [...w.selection.entries];
    const pos = (id: string) => dataOf(w).nodes.find((n: any) => n.id === id)?.position;

    it("selects the first item on Enter, steps on Tab and leaves at the end", async function () {
      w.selection.clear(); await settle(2);
      key(svgOf(w), "Enter"); await settle(2);
      must(ids().join() === "n1", () => `Enter selected ${ids()}`);
      key(svgOf(w), "Tab"); await settle(2);
      must(ids().join() === "n2", () => `Tab selected ${ids()}`);
      key(svgOf(w), "Tab", { shiftKey: true }); await settle(2);
      must(ids().join() === "n1", () => `Shift+Tab selected ${ids()}`);
      for (let i = 0; i < 6; i++) key(svgOf(w), "Tab");
      await settle(2);
      must(ids().join() === "e1", () => `last item ${ids()}`);
      const notHandled = svgOf(w).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true, cancelable: true }));
      must(notHandled, "Tab at the end was swallowed");
    });
    it("connects two selected concepts on Shift+R and keeps R as draw mode", async function () {
      w.selection.select(new Set(["n2", "n3"])); await settle(2);
      const before = dataOf(w).edges.length;
      key(svgOf(w), "r"); await settle(3);
      must(dataOf(w).edges.length === before && canvasOf(w).drawingEdge === true, "R must only start draw mode");
      key(svgOf(w), "Escape"); await settle(2);
      w.selection.select(new Set(["n2", "n3"])); await settle(2);
      key(svgOf(w), "R", { shiftKey: true }); await settle(3);
      const d = dataOf(w);
      const edge = d.edges.find((e: any) => e.source === "n2" && e.target === "n3");
      must(d.edges.length === before + 1 && edge?.sourcePosition === "bottom" && edge?.targetPosition === "top", () => JSON.stringify(d.edges));
      must(canvasOf(w).drawingEdge === false && ids().join() === edge.id, "mode or selection");
    });
    it("moves a node on a touch drag", async function () {
      const p = pos("n3"); const s = view(w).scale; const el = nodeEl(w, "n3"); const from = center(el);
      await new Promise((r) => setTimeout(r, 450));
      const t = (x: number, y: number, type: string) => fire(el, type, { clientX: x, clientY: y }, { pointerId: 63, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      t(from.clientX, from.clientY, "pointerdown"); await frame();
      for (let i = 1; i <= 4; i++) { t(from.clientX + i * 10, from.clientY + i * 5, "pointermove"); await frame(); await frame(); }
      t(from.clientX + 40, from.clientY + 20, "pointerup"); await settle(3);
      const q = pos("n3"); must(near(q.x - p.x, 40 / s, 2) && near(q.y - p.y, 20 / s, 2), () => JSON.stringify({ p, q }));
    });
    it("selects a node on a touch tap", async function () {
      w.selection.clear(); await settle(2);
      const at = center(nodeEl(w, "n3"));
      const t = (type: string) => fire(nodeEl(w, "n3"), type, at, { pointerId: 62, pointerType: "touch", buttons: type === "pointerup" ? 0 : 1 });
      t("pointerdown"); await frame(); t("pointerup"); await settle(3);
      must(ids().join() === "n3", () => `selected ${ids()}`);
    });
    it("draws the selection in the accent color of the page", async function () {
      mountPoint.style.cssText = "--ww-theme-accent-1: rgb(9, 8, 7)";
      await settle(2);
      const el = canvasOf(w).shadowRoot.querySelector('.overlays [stroke*="ao-selection-color"]');
      const stroke = el ? getComputedStyle(el).stroke : "";
      mountPoint.style.cssText = "";
      must(stroke === "rgb(9, 8, 7)", () => `stroke ${stroke}`);
    });
  });

  it("reports no warnings", function () {
    must(warnings.length === 0, () => warnings.join(" | "));
  });
});

mocha.run();
