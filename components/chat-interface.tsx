"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, Globe, Mic, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

// 定义消息类型
type Message = {
  id: number;
  content: string;
  role: "user" | "ai";
};

// 添加类型定义
type StreamChunk = {
  choices: {
    delta: {
      content?: string;
    };
  }[];
};

// 添加新的类型定义
type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

// 添加配置常量
const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "Qwen/Qwen2.5-7B-Instruct",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
  searchApiUrl: "/api/search",
  systemMessage: `你是一个专业的旅游助手，主要帮助用户规划旅行行程。请遵循以下规则：

1. 当用户提供城市和天数时（例如"重庆、三天两夜"):
   - 根据提供的景点信息，以 markdown 列表形式输出推荐景点
   - 每个景点前加上 '- ' 符号
   - 确保景点真实存在且位于指定城市
   - 尽量保持输出12个景点,如果不足则输出已获取的景点

2. 当用户询问与旅游无关的问题时：
   回复："抱歉，我是一个旅游助手，主要帮助规划行程。你可以告诉我想去的城市和游玩天数（例如：重庆、三天两夜），我来帮你推荐景点！"

3.在输出景点前可以加一两句话的描述，比如"我为你着了下这个地方的景点,为你推荐n个景点,这些都是我从权威网站上筛选的必玩景点"

4. 当用户只提供城市名时：
   温和地询问："请告诉我你计划游玩的天数，这样我可以更好地为你推荐合适的景点。"

5. 景点输出格式要求：
   - 只输出景点列表，不添加额外描述
   - 确保相同城市的推荐结果保持一致
   - 按照景点评分从高到低排序`,
};

// 添加机器人配置
const BOT_CONFIG = {
  name: "景点推荐bot",
  avatar: "/placeholder.svg", // 你可以替换成实际的头像路径
};

const ChatInterface = () => {
  // 添加状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now(),
      content:
        "请告诉我你想游玩的城市，并且告诉我游玩的天数（例如：重庆、三天两夜），我会为你提供完整的旅行攻略！",
      role: "ai",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [webEnabled, setWebEnabled] = useState(false);

  // 取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 添加搜索函数
  const searchWeb = async (query: string): Promise<string> => {
    try {
      const response = await fetch(API_CONFIG.searchApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
        // 添加超时处理
        signal: AbortSignal.timeout(10000), // 10 秒超时
      });

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status}`);
      }

      const searchResults: SearchResult[] = await response.json();

      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return "未找到相关搜索结果";
      }

      // 将搜索结果格式化为文本
      return searchResults
        .map(
          (result) =>
            `标题: ${result.title}\n链接: ${result.link}\n摘要: ${result.snippet}\n`
        )
        .join("\n---\n");
    } catch (error) {
      console.error("搜索失败:", error);
      return `搜索出现错误: ${
        error instanceof Error ? error.message : "未知错误"
      }`;
    }
  };

  // 添加错误处理函数
  const handleError = (error: any) => {
    console.error("发生错误:", error);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: "抱歉，处理您的请求时出现错误。请稍后重试。",
        role: "ai",
      },
    ]);
    setIsLoading(false);
  };

  // 添加文本清理函数
  const cleanSpotName = (name: string): string => {
    return name
      .replace(/[A-Za-z]+/g, "") // 移除英文字母
      .replace(/[^\u4e00-\u9fa5\s\d：，。、（）()]+/g, "") // 只保留中文、数字、常用标点
      .replace(/\s+/g, " ") // 将多个空格替换为单个空格
      .replace(/^\s+|\s+$/g, "") // 移除首尾空格
      .replace(/([：，。、（）()])\s+/g, "$1") // 移除标点符号后的空格
      .replace(/\s+([：，。、（）()])/g, "$1"); // 移除标点符号前的空格
  };

  // 修改发送消息处理函数
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();

    if (!trimmedInput || isLoading || trimmedInput.length > 1000) {
      // 添加输入长度限制
      if (trimmedInput.length > 1000) {
        alert("输入内容过长，请限制在1000字符以内");
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      content: inputValue,
      role: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      let finalPrompt = inputValue;

      // 检查输入是否包含城市名称
      const cityMatch = inputValue.match(/^([^、]+)/);
      if (cityMatch && webEnabled) {
        try {
          const tripAdvisorResults = await fetch("/api/tripadvisor", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ city: cityMatch[1] }),
          }).then((res) => res.json());

          finalPrompt = `
我为你整理了${cityMatch[1]}的热门景点，以下是从权威旅游网站筛选出的必玩景点：

${handleTripAdvisorResults(tripAdvisorResults)}

请按照以上景点列表格式输出，保持原有顺序。如果你觉得某些景点不够准确或者有更好的推荐，可以适当调整，但请保持中文格式并确保景点名称准确。
`;
        } catch (error) {
          console.error("搜索失败:", error);
          finalPrompt = inputValue;
        }
      }

      const response = await fetch(API_CONFIG.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            {
              role: "system",
              content: API_CONFIG.systemMessage,
            },
            {
              role: "user",
              content: finalPrompt,
            },
          ],
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("API请求失败");
      }

      // 创建一个新的AI消息
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: "",
        role: "ai",
      };
      setMessages((prev) => [...prev, aiMessage]);

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        try {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data: StreamChunk = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || "";

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessage.id
                      ? { ...msg, content: msg.content + content }
                      : msg
                  )
                );
              } catch (e) {
                console.error("解析响应数据失败:", e);
                continue;
              }
            }
          }
        } catch (error) {
          console.error("读取流数据失败:", error);
          break;
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("请求被取消");
      } else {
        handleError(error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 修改 TripAdvisor 景点处理逻辑
  const handleTripAdvisorResults = (results: any[]) => {
    if (!Array.isArray(results) || results.length === 0) {
      return "- 抱歉，未能找到该城市的景点信息";
    }

    // 过滤并清理景点数据
    const validSpots = results
      .map((spot) => ({
        ...spot,
        name: cleanSpotName(spot.name),
        description: cleanSpotName(spot.description),
      }))
      .filter(
        (spot) =>
          spot.name && // 确保名称不为空
          spot.name.length >= 2 && // 确保名称长度合理
          spot.rating > 0 && // 确保有评分
          !/^\d+$/.test(spot.name) // 排除纯数字名称
      );

    // 确保至少返回景点，如果不足则重复获取
    const minSpots = 12;
    let spots = [...validSpots];
    while (spots.length < minSpots && validSpots.length > 0) {
      spots = [...spots, ...validSpots.slice(0, minSpots - spots.length)];
    }

    // 格式化输出
    return spots
      .slice(0, minSpots)
      .map((spot) => {
        const rating = spot.rating.toFixed(1); // 保留一位小数
        return `- ${spot.name}（评分：${rating}分）`;
      })
      .join("\n");
  };

  return (
    <Card className="w-full h-[90vh] max-w-6xl flex flex-col">
      <div className="p-4 border-b flex items-center gap-3 bg-primary/5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={BOT_CONFIG.avatar} alt="Bot Avatar" />
          <AvatarFallback>Bot</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{BOT_CONFIG.name}</div>
          <div className="text-sm text-muted-foreground">专业景点推荐助手</div>
        </div>
      </div>

      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "ai" && (
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={BOT_CONFIG.avatar}
                    alt={`${BOT_CONFIG.name} Avatar`}
                  />
                  <AvatarFallback>{BOT_CONFIG.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`inline-block px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted prose prose-neutral dark:prose-invert"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="whitespace-pre-wrap">
                      {message.content}
                    </span>
                  ) : (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        className="break-words"
                        components={{
                          pre: ({ node, ...props }) => (
                            <div className="overflow-auto my-2 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-lg">
                              <pre {...props} />
                            </div>
                          ),
                          code: ({ node, inline, className, ...props }: any) =>
                            inline ? (
                              <code
                                className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded"
                                {...props}
                              />
                            ) : (
                              <code {...props} />
                            ),
                          p: ({ node, ...props }) => (
                            <p className="my-1" {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      {message.content === "" && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>正在思考...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="User Avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="border-t p-4">
        <form
          onSubmit={handleSendMessage}
          className="flex w-full gap-2 items-center"
        >
          <Button
            variant="outline"
            size="icon"
            type="button"
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='给"ChatGPT"发送消息'
            className="flex-1"
            disabled={isLoading}
          />

          <Button
            variant="outline"
            size="icon"
            type="button"
            disabled={isLoading}
            onClick={() => setWebEnabled(!webEnabled)}
            className={webEnabled ? "bg-primary text-primary-foreground" : ""}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            disabled={isLoading}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
