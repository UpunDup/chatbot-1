import puppeteer from "puppeteer-core";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const browser = await puppeteer.launch({
      headless: "new",
      // 使用本地已安装的 Chrome
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS路径
      // 如果是 Windows，路径类似：
      // 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });

    const page = await browser.newPage();

    // 访问Google搜索
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`
    );

    // 等待搜索结果加载
    await page.waitForSelector("div#search");

    // 提取搜索结果
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll("div.g");
      return Array.from(items)
        .map((item) => {
          const title = item.querySelector("h3")?.textContent || "";
          const snippet = item.querySelector("div.VwiC3b")?.textContent || "";
          return `${title}\n${snippet}`;
        })
        .slice(0, 5); // 只取前5条结果
    });

    await browser.close();

    return Response.json(results);
  } catch (error) {
    console.error("搜索失败:", error);
    return Response.json({ error: "搜索失败" }, { status: 500 });
  }
}
