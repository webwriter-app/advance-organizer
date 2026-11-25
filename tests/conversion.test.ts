/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { mount, reset, dataOf, must, settle } from "./helpers";
import fixture from "./fixtures/organizer.json";

mocha.setup(getMochaConfig());

const file = (text: string, name: string, type: string) => new File([text], name, { type });
const labels = (w: any) => dataOf(w).nodes.map((n: any) => n.label.text);

describe("<webwriter-advance-organizer> conversions", function () {
  this.timeout(20000);
  let w: any;
  before(async function () { w = await mount({ edit: "fake" }); });
  after(reset);

  describe("lists", function () {
    it("takes a nested ul as concepts with arrows", async function () {
      const fragment = document.createDocumentFragment();
      const ul = document.createElement("ul");
      ul.innerHTML = "<li>Cells<ul><li>Nucleus</li><li>Membrane<ol><li>Lipids</li></ol></li></ul></li><li>Tissue</li>";
      fragment.append(ul);
      must(w.loadList(fragment) === true, "declined");
      await settle(3);
      const data = dataOf(w);
      must(data.nodes.length === 5 && data.edges.length === 3, () => `${data.nodes.length} nodes, ${data.edges.length} edges`);
      const cells = data.nodes.find((n: any) => n.label.text === "Cells");
      must(cells.style.preset === "main-topic", "preset of the root");
    });
    it("declines a fragment without list items", function () {
      const fragment = document.createDocumentFragment();
      fragment.append(document.createElement("ul"));
      must(w.loadList(fragment) === false, "accepted an empty list");
    });
    it("gives back the same outline as a nested ul", function () {
      const ul = w.toList();
      must(ul.localName === "ul", "tag");
      must(ul.outerHTML === "<ul><li>Cells<ul><li>Nucleus</li><li>Membrane<ul><li>Lipids</li></ul></li></ul></li><li>Tissue</li></ul>", ul.outerHTML);
      const first = ul.querySelector(":scope > li");
      must(first.firstChild.textContent === "Cells" && first.querySelector(":scope > ul > li > ul > li").textContent === "Lipids", ul.outerHTML);
    });
    it("lists every concept once, also in a cycle", async function () {
      const data = fixture as any;
      const apply = await w.importJson(file(JSON.stringify({ ...data, edges: [...data.edges, { id: "e3", source: "b", target: "a", style: {} }] }), "a.json", "application/json"));
      apply(); await settle(3);
      must(w.toList().querySelectorAll("li").length === 3, w.toList().outerHTML);
    });
  });

  describe("files", function () {
    it("imports a valid file and replaces the content only when applied", async function () {
      const before = labels(w).join();
      const apply = await w.importJson(file(JSON.stringify(fixture), "organizer.json", "application/json"));
      must(labels(w).join() === before, "changed before apply");
      apply(); await settle(3);
      must(labels(w).join() === "Cells,Nucleus,Membrane", labels(w).join());
    });
    it("rejects invalid files with a message and changes nothing", async function () {
      const before = labels(w).join();
      for (const text of ["no json", "[]", JSON.stringify({ nodes: [{ id: "x" }] }), JSON.stringify({ ...fixture, edges: [{ id: "q", source: "a", target: "zz" }] }), JSON.stringify({ ...fixture, images: [{ id: "i", position: { x: 0, y: 0 }, dimension: { width: 1, height: 1 }, src: "https://example.com/a.png" }] })]) {
        let message = "";
        try { await w.importJson(file(text, "bad.json", "application/json")); } catch (error) { message = (error as Error).message; }
        must(message.length > 0, "accepted " + text);
      }
      must(labels(w).join() === before, "changed");
    });
    it("exports JSON that imports to the same content", async function () {
      const exported = w.exportJson();
      must(exported.name.endsWith(".json") && exported.type === "application/json", "file");
      const sent = JSON.parse(await exported.text());
      const apply = await w.importJson(exported); apply(); await settle(3);
      const now = dataOf(w);
      must(JSON.stringify(now.nodes) === JSON.stringify(sent.nodes) && JSON.stringify(now.edges) === JSON.stringify(sent.edges), "round trip differs");
    });
    it("exports an SVG with the labels and arrows", async function () {
      const exported = w.exportSvg();
      must(exported.type === "image/svg+xml" && exported.name.endsWith(".svg"), "file");
      const doc = new DOMParser().parseFromString(await exported.text(), "image/svg+xml");
      must(!doc.querySelector("parsererror"), "not well-formed");
      must(doc.querySelectorAll("text").length === 3 && doc.querySelectorAll("line").length === 2, "content");
    });
  });

  describe("signals", function () {
    it("publishes the concept whose page is open", async function () {
      const { openPage, closePage } = await import("./helpers");
      const mounted = await mount({ edit: "fake" });
      must(mounted.signals.openConcept.get() === "", "not empty at start");
      openPage(mounted, "n2"); await settle(4);
      must(mounted.signals.openConcept.get() === "B", mounted.signals.openConcept.get());
      closePage(mounted); await settle(4);
      must(mounted.signals.openConcept.get() === "", "not cleared");
    });
  });
});

mocha.run();
