import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    // 构建马蜂窝游记搜索URL
    const searchUrl = `https://www.mafengwo.cn/search/q.php?q=${encodeURIComponent(
      query
    )}&t=notes&kt=1`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: "https://www.mafengwo.cn/",
      },
    });

    if (!response.ok) {
      throw new Error("搜索请求失败");
    }

    const html = await response.text();

    // 提取游记信息
    const noteRegex = /<h3[^>]*>.*?<a[^>]*>([^<]+)<\/a>.*?(\d+)浏览/g;
    const notes: string[] = [];
    let match;

    while ((match = noteRegex.exec(html)) !== null) {
      if (match[1] && match[2]) {
        notes.push(`${match[1].trim()} (${match[2]}次浏览)`);
      }
    }

    // 如果没有找到游记，尝试提取其他相关内容
    if (notes.length === 0) {
      const contentRegex = /<h3[^>]*>[^<]*<a[^>]*>([^<]+)<\/a>/g;
      while ((match = contentRegex.exec(html)) !== null) {
        if (match[1]) {
          notes.push(match[1].trim());
        }
      }
    }

    // 只返回前5个结果
    const results = notes.slice(0, 5);

    // 如果没有找到任何结果
    if (results.length === 0) {
      results.push("未找到相关游记信息");
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("马蜂窝游记搜索失败:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
