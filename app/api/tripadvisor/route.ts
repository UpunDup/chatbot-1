import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: Request) {
  try {
    const { city } = await request.json();

    // 构建 TripAdvisor 搜索 URL
    const searchUrl = `https://www.tripadvisor.cn/Search?q=${encodeURIComponent(
      city
    )}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error("搜索请求失败");
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const attractions: Array<{
      name: string;
      rating: number;
      reviews: string;
      description: string;
    }> = [];

    // 提取景点信息
    $(".result-title").each((i, elem) => {
      const name = $(elem).text().trim();
      const ratingText =
        $(elem)
          .closest(".result-card")
          .find(".ui_bubble_rating")
          .attr("class") || "0";
      const rating =
        parseInt(ratingText.match(/bubble_(\d+)/)?.[1] || "0") / 10;
      const reviews = $(elem)
        .closest(".result-card")
        .find(".review-count")
        .text()
        .trim();
      const description = $(elem)
        .closest(".result-card")
        .find(".description")
        .text()
        .trim();

      if (name && rating > 0) {
        attractions.push({
          name,
          rating,
          reviews,
          description,
        });
      }
    });

    // 按评分排序并返回前20个
    const topAttractions = attractions
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20);

    return NextResponse.json(topAttractions);
  } catch (error) {
    console.error("TripAdvisor搜索失败:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
