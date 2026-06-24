import puppeteer from "puppeteer";

export const WINDY_SCREENSHOT_WIDTH = 1280;
export const WINDY_SCREENSHOT_HEIGHT = 720;
const WINDY_RENDER_TIMEOUT_MS = 45_000;

interface WindyPage {
  goto(url: string, options: { timeout: number; waitUntil: "domcontentloaded" }): Promise<unknown>;
  waitForSelector(selector: string, options: { timeout: number; visible: boolean }): Promise<unknown>;
  waitForFunction(
    pageFunction: () => boolean,
    options: { timeout: number },
  ): Promise<unknown>;
  screenshot(options: {
    fullPage: false;
    quality: number;
    type: "jpeg";
  }): Promise<Uint8Array>;
}

interface WindyBrowser {
  newPage(): Promise<WindyPage>;
  close(): Promise<void>;
}

export type WindyBrowserFactory = () => Promise<WindyBrowser>;

const launchWindyBrowser: WindyBrowserFactory = async () =>
  (await puppeteer.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    defaultViewport: {
      width: WINDY_SCREENSHOT_WIDTH,
      height: WINDY_SCREENSHOT_HEIGHT,
      deviceScaleFactor: 1,
    },
  })) as unknown as WindyBrowser;

export async function captureWindyScreenshot(
  url: string,
  launchBrowser: WindyBrowserFactory = launchWindyBrowser,
): Promise<Buffer> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto(url, {
      timeout: WINDY_RENDER_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("canvas", {
      timeout: WINDY_RENDER_TIMEOUT_MS,
      visible: true,
    });
    await page.waitForFunction(
      () => {
        const text = (
          globalThis as unknown as { document: { body: { innerText: string } } }
        ).document.body.innerText;
        return (
          text.includes("Duration of the accumulation:") &&
          text.includes("Mumbai") &&
          text.includes("mm")
        );
      },
      { timeout: WINDY_RENDER_TIMEOUT_MS },
    );

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 80,
      fullPage: false,
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
