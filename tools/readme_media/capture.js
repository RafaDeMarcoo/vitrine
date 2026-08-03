"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "../..");
const output = path.join(root, "docs/assets/readme");

async function settle(page) {
  await page.waitForFunction(() => {
    const send = document.querySelector(".vt-send");
    return send && !send.disabled && !document.querySelector(".vt-typing");
  });
  await page.waitForTimeout(250);
}

async function send(page, message) {
  await page.locator(".vt-composer textarea").fill(message);
  await page.locator(".vt-composer textarea").press("Enter");
  await settle(page);
}

async function prepare(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  await page.locator("#device").waitFor();
  await page.locator(".vt-chips").waitFor();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const stage = document.querySelector(".stage");
    const device = document.querySelector("#device");
    stage.style.width = "527px";
    device.style.width = "527px";
    device.style.height = "1028px";
    device.style.minHeight = "1028px";
    device.style.border = "0";
    device.style.borderRadius = "0";
    device.style.boxShadow = "none";
  });
}

async function capture(page, fileName) {
  await page.locator(".vt-composer textarea").blur();
  await page.locator("#device").screenshot({ path: path.join(output, fileName) });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1 });

  try {
    await prepare(page);
    await send(page, "Motorcycles under $12,000");
    await capture(page, "vitrine-inventory.png");

    await send(page, "Estimate a monthly payment");
    await capture(page, "vitrine-finance.png");

    await prepare(page);
    await page.locator('.theme[data-key="violet"]').click();
    await page.locator("#tog-scheme").click();
    await send(page, "A boat the whole family fits in");
    await capture(page, "vitrine-white-label.png");
  } finally {
    await browser.close();
  }

  console.log("Captured Vitrine README product states in " + output);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
