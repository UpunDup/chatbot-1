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

// 添加配置常量
const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "Qwen/Qwen2.5-7B-Instruct",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
  systemMessage:
    "你是一个景点推荐机器人。请将收到的景点信息以 markdown 列表的形式输出，每个景点前面加上 '- ' 符号。不要添加任何额外的描述、建议或者行程规划。",
};

const ChatInterface = () => {
  // 添加状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now(),
      content:
        "请你告诉我你想游玩的城市，并且告诉我游玩的天数（比如重庆、三天两夜），我会为你提供完整的旅行攻略！",
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

  // 修改发送消息处理函数
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

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
          // 只获取 TripAdvisor 景点信息
          const tripAdvisorResults = await fetch("/api/tripadvisor", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ city: cityMatch[1] }),
          }).then((res) => res.json());

          finalPrompt = `
请将以下${cityMatch[1]}的景点信息以 markdown 列表形式输出:

${
  Array.isArray(tripAdvisorResults)
    ? tripAdvisorResults
        .map((spot) => `- ${spot.name} (评分: ${spot.rating}分)`)
        .join("\n")
    : "- 未找到景点信息"
}

请直接列出景点名称，每行以 '- ' 开头，保持原有格式，不要添加任何额外的描述或建议。
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
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
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
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("请求被取消");
      } else {
        console.error("发送消息失败:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 2,
            content: "抱歉，发送消息时出现错误。",
            role: "ai",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <Card className="w-full h-[90vh] max-w-6xl flex flex-col">
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
                  <AvatarImage src="/placeholder.svg" alt="AI Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
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
