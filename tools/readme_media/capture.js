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

async function captureConversation(page) {
  await prepare(page);
  await page.locator('.theme[data-key="pale"]').click();
  await page.locator("#tog-scheme").click();
  await page.waitForTimeout(250);
  await capture(page, "vitrine-choice-chips.png");

  await send(page, "Motorcycles under $12,000");
  await capture(page, "vitrine-unit-carousel.png");

  await send(page, "Compare the Yamaha MT-09, Kawasaki Z900 and Moto Guzzi V7");
  await capture(page, "vitrine-unit-compare.png");

  await send(page, "What are the monthly payments on the Moto Guzzi V7?");
  await capture(page, "vitrine-finance-slider.png");

  await send(page, "What's my current bike worth as a trade-in?");
  await capture(page, "vitrine-trade-in.png");

  await send(page, "I'd like to book a visit");
  await capture(page, "vitrine-schedule.png");

  await page.locator(".vt-slot:not([disabled])").first().click();
  await settle(page);
  await capture(page, "vitrine-lead-capture.png");

  const form = page.locator(".vt-card form").last();
  await form.locator('input[name="name"]').fill("Alex Moreno");
  await form.locator('input[name="phone"]').fill("(555) 012-8899");
  await form.locator('input[name="email"]').fill("alex@example.com");
  await form.getByRole("button", { name: "Confirm booking" }).click();
  await settle(page);
  await capture(page, "vitrine-summary-receipt.png");
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

    await captureConversation(page);
  } finally {
    await browser.close();
  }

  console.log("Captured Vitrine README product states in " + output);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
