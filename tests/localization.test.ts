/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { warnings, mount, reset, mountPoint, canvasOf, must, zoomButton, zoomButtons, until } from "./helpers";

mocha.setup(getMochaConfig());

describe("<webwriter-advance-organizer> localization", function () {
  this.timeout(20000);
  let w: any;

  before(async function () {
    w = await mount({ edit: false, lang: "de" });
  });
  after(reset);

  it("translates the zoom controls for lang=de", async function () {
    await until(() => zoomButton(w, "Hineinzoomen") || zoomButton(w, "Vergrößern") || zoomButton(w, "Zoom in") === undefined, "translated");
  });
  it("follows a language change at runtime", async function () {
    w.setAttribute("lang", "fr");
    await until(() => zoomButtons(w).some((x) => /zoom/i.test(x.getAttribute("label")!) && x.getAttribute("label") !== "Zoom in" && x.getAttribute("label") !== "Zoom out"), "french");
  });
  it("uses a language inherited from an ancestor without reflecting it onto the widget", async function () {
    mountPoint.innerHTML = ""; document.documentElement.lang = "es";
    const x = await mount({ edit: false });
    await until(() => zoomButton(x, "Acercar") || zoomButton(x, "Ampliar") || !zoomButtons(x).some((b) => b.getAttribute("label") === "Zoom in"), "es");
    must(!x.hasAttribute("lang"), "lang reflected");
  });
  it("reports no warnings", function () {
    must(warnings.length === 0, () => warnings.join(" | "));
  });
});

mocha.run();
