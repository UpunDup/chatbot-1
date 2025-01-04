import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 添加缓存机制
const attractionsCache = new Map<
  string,
  {
    timestamp: number;
    attractions: Array<{
      name: string;
      rating: number;
      reviews: string;
      verified: boolean;
      originalIndex: number;
    }>;
  }
>();

// 添加景点名称清理函数
function cleanAttractionName(name: string): string {
  return name
    .replace(/·.*$/, "") // 删除中文点号及其后面的内容
    .replace(/[a-zA-Z]+\s*·\s*[^·]+/, "") // 删除英文+点号+文字的组合
    .replace(/\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*\s*$/, "") // 删除末尾的英文单词
    .replace(/^[a-zA-Z]+(?:\s+[a-zA-Z]+)*\s*/, "") // 删除开头的英文单词
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, "") // 只保留中文、英文、数字和空格
    .replace(/(?:Tower|Park|Garden|Mall|Center|Square)$/i, "") // 删除常见英文后缀
    .replace(/[^\u4e00-\u9fa5]+$/, "") // 删除末尾的非中文字符
    .replace(/^[^\u4e00-\u9fa5]+/, "") // 删除开头的非中文字符
    .replace(/\s+/g, " ") // 规范化空格
    .trim();
}

// 添加景点质量评估函数
function evaluateAttractionQuality(
  name: string,
  rating: number,
  reviews: string
): number {
  let score = 0;

  // 评分权重
  score += rating * 10;

  // 评论数量权重
  const reviewCount = parseInt(reviews.replace(/[^0-9]/g, "") || "0");
  if (reviewCount > 1000) score += 30;
  else if (reviewCount > 500) score += 20;
  else if (reviewCount > 100) score += 10;

  // 关键词权重
  const importantKeywords = [
    "广场",
    "寺",
    "庙",
    "公园",
    "博物馆",
    "大厦",
    "古镇",
    "景区",
    "遗址",
    "陵",
    "宫",
    "园",
    "塔",
    "湖",
    "山",
    "长城",
    "故宫",
    "Square",
    "Temple",
    "Park",
    "Museum",
    "Palace",
    "Tower",
    "Lake",
    "Mountain",
  ];

  const excludeKeywords = [
    "店",
    "超市",
    "商场",
    "小吃",
    "餐厅",
    "购物",
    "专卖",
    "Store",
    "Shop",
    "Mall",
    "Restaurant",
    "Cafe",
    "Market",
  ];

  if (importantKeywords.some((keyword) => name.includes(keyword))) {
    score += 15;
  }

  if (excludeKeywords.some((keyword) => name.includes(keyword))) {
    score -= 20;
  }

  return score;
}

// 添加景点验证函数
function validateAttraction(name: string, city: string): boolean {
  // 检查是否包含无效字符或模式
  const invalidPatterns = [
    /[äóöüß]/, // 特殊字母
    /[^\u4e00-\u9fa5a-zA-Z0-9\s]/, // 非法字符
    /^[a-zA-Z\s]+$/, // 纯英文名
    /^(?:the|a|an)\s+/i, // 英文冠词开头
    /\d{4,}/, // 4位以上数字
    /(?:user|admin|test|demo)/i, // 开发相关词汇
    /(?:port[ae]|street|road|ave)/i, // 通用地点词汇
  ];

  if (invalidPatterns.some((pattern) => pattern.test(name))) {
    return false;
  }

  // 检查景点名称长度
  if (name.length < 2 || name.length > 20) {
    return false;
  }

  // 确保至少包含一个中文字符
  if (!/[\u4e00-\u9fa5]/.test(name)) {
    return false;
  }

  // 检查是否与城市相关
  const cityName = city.replace(/市$/, "");
  const unrelatedCities = [
    "北京",
    "上海",
    "广州",
    "深圳",
    "成都",
    "重庆",
    "西安",
    "杭州",
  ].filter((c) => c !== cityName);

  if (unrelatedCities.some((c) => name.includes(c))) {
    return false;
  }

  return true;
}

// 修改校验景点的函数
async function verifyAttraction(
  name: string,
  baseUrl: string,
  city: string,
  retryCount = 0
): Promise<{
  exists: boolean;
  correctName?: string;
}> {
  try {
    if (retryCount >= 3) {
      return { exists: true, correctName: cleanAttractionName(name) };
    }

    const searchUrl = `${baseUrl}/Search?q=${encodeURIComponent(
      city + " " + name
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return verifyAttraction(name, baseUrl, city, retryCount + 1);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const attractionResults = $(".result-title").filter((_, elem) => {
      const type = $(elem).data("type");
      const text = $(elem).text().trim();
      return (
        (type === "ATTRACTION" || type === "ATTRACTION_PRODUCT") &&
        text.length >= 2
      );
    });

    let bestMatch = null;
    let bestMatchScore = 0;
    attractionResults.each((_, elem) => {
      const text = cleanAttractionName($(elem).text().trim());
      const type = $(elem).data("type");
      const isHighQualityType =
        type === "ATTRACTION" && !text.match(/店|超市|商场|餐厅/);

      if (isHighQualityType && (text.includes(name) || name.includes(text))) {
        const currentScore = text.length + (text === name ? 10 : 0);
        if (currentScore > bestMatchScore) {
          bestMatch = text;
          bestMatchScore = currentScore;
        }
      }
    });

    if (bestMatch) {
      return { exists: true, correctName: bestMatch };
    }

    if (attractionResults.length > 0) {
      return {
        exists: true,
        correctName: cleanAttractionName(
          attractionResults.first().text().trim()
        ),
      };
    }

    return { exists: true, correctName: cleanAttractionName(name) };
  } catch (error) {
    console.error(`验证景点失败: ${name}`, error);
    if (retryCount < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return verifyAttraction(name, baseUrl, city, retryCount + 1);
    }
    return { exists: true, correctName: cleanAttractionName(name) };
  }
}

// 修改缓存机制，增加缓存时间
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时的缓存时间

// 修改获取景点数据的主要逻辑
async function fetchAllAttractions(
  baseUrl: string,
  $: cheerio.CheerioAPI,
  city: string
): Promise<
  Array<{
    name: string;
    rating: number;
    reviews: string;
    originalIndex: number;
    qualityScore: number;
  }>
> {
  const allAttractions: Array<{
    name: string;
    rating: number;
    reviews: string;
    originalIndex: number;
    qualityScore: number;
  }> = [];

  // 获取所有可用页面的数据（最多5页）
  let currentPage = 0;
  const MAX_PAGES = 5;

  // 获取第一页数据
  $(".attraction_element").each((i, elem) => {
    const rawName = $(elem).find(".listing_title a").text().trim();
    const name = cleanAttractionName(rawName);
    const ratingText = $(elem).find(".ui_bubble_rating").attr("class") || "0";
    const rating = parseInt(ratingText.match(/bubble_(\d+)/)?.[1] || "0") / 10;
    const reviews = $(elem).find(".review_count").text().trim();

    if (name && rating >= 4.0 && validateAttraction(name, city)) {
      const qualityScore = evaluateAttractionQuality(name, rating, reviews);
      if (qualityScore > 30) {
        allAttractions.push({
          name,
          rating,
          reviews,
          originalIndex: i,
          qualityScore,
        });
      }
    }
  });

  // 获取后续页面数据
  while (currentPage < MAX_PAGES) {
    const nextPageUrl = $(".nav.next").first().attr("href");
    if (!nextPageUrl) break;

    try {
      const nextPageResponse = await fetch(`${baseUrl}${nextPageUrl}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      });

      if (!nextPageResponse.ok) break;

      const nextPageHtml = await nextPageResponse.text();
      const $nextPage = cheerio.load(nextPageHtml);

      $nextPage(".attraction_element").each((i, elem) => {
        const rawName = $nextPage(elem).find(".listing_title a").text().trim();
        const name = cleanAttractionName(rawName);
        const ratingText =
          $nextPage(elem).find(".ui_bubble_rating").attr("class") || "0";
        const rating =
          parseInt(ratingText.match(/bubble_(\d+)/)?.[1] || "0") / 10;
        const reviews = $nextPage(elem).find(".review_count").text().trim();

        if (name && rating >= 4.0 && validateAttraction(name, city)) {
          const qualityScore = evaluateAttractionQuality(name, rating, reviews);
          if (qualityScore > 30) {
            allAttractions.push({
              name,
              rating,
              reviews,
              originalIndex: allAttractions.length + i,
              qualityScore,
            });
          }
        }
      });

      currentPage++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("获取下一页失败:", error);
      break;
    }
  }

  return allAttractions;
}

// 修改主函数中的处理逻辑
export async function POST(request: Request) {
  try {
    const { city } = await request.json();
    const cacheKey = city.toLowerCase().trim();

    // 检查缓存
    const cached = attractionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.attractions);
    }

    const baseUrl = "https://www.tripadvisor.cn";
    const searchUrl = `${baseUrl}/Search?q=${encodeURIComponent(city)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!searchResponse.ok) {
      throw new Error("搜索请求失败");
    }

    const searchHtml = await searchResponse.text();
    const $search = cheerio.load(searchHtml);

    const cityUrl = $search('.result-title[data-type="GEO"]')
      .first()
      .closest("a")
      .attr("href");
    if (!cityUrl) {
      throw new Error("未找到城市页面");
    }

    const cityFullUrl = `${baseUrl}${cityUrl.replace(
      "Tourism",
      "Attractions-g"
    )}-Activities-${city}`;

    const attractionsResponse = await fetch(cityFullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!attractionsResponse.ok) {
      throw new Error("获取景点列表失败");
    }

    const attractionsHtml = await attractionsResponse.text();
    const $ = cheerio.load(attractionsHtml);

    // 获取所有景点数据
    const allAttractions = await fetchAllAttractions(baseUrl, $, city);

    // 对所有获取的景点进行稳定排序
    const sortedAttractions = allAttractions
      .sort((a, b) => {
        // 首先按质量分数排序
        const qualityDiff = b.qualityScore - a.qualityScore;
        if (qualityDiff !== 0) return qualityDiff;

        // 其次按评分排序
        const ratingDiff = b.rating - a.rating;
        if (ratingDiff !== 0) return ratingDiff;

        // 最后按名称字母顺序排序（确保稳定性）
        return a.name.localeCompare(b.name, "zh-CN");
      })
      // 去重
      .filter(
        (attraction, index, self) =>
          index === self.findIndex((a) => a.name === attraction.name)
      );

    // 选择前20个最优质的景点
    const finalResults = sortedAttractions.slice(0, 20).map((result) => ({
      name: result.name,
      rating: result.rating,
      reviews: result.reviews,
      verified: true,
      originalIndex: result.originalIndex,
    }));

    // 更新缓存
    attractionsCache.set(cacheKey, {
      timestamp: Date.now(),
      attractions: finalResults,
    });

    return NextResponse.json(finalResults);
  } catch (error) {
    console.error("TripAdvisor搜索失败:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
