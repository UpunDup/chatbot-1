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
  model: "Qwen/QVQ-72B-Preview",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
  systemMessage: `你是一个专业的旅游助手。对于用户提供的城市：
1. 首先用1-2句话简要介绍这个城市的特色
2. 然后说"以下是我为您精选的最佳游玩景点："
3. 最后将收到的景点信息以 markdown 列表的形式输出，每个景点前面加上 '- ' 符号
4. 不要添加任何额外的建议或行程规划`,
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
  const [selectedModel, setSelectedModel] = useState("gpt-4");

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

    try {
      setIsLoading(true);
      const userMessage = inputValue.trim();
      setInputValue("");

      // 添加用户消息到对话
      const newUserMessage: Message = {
        id: Date.now(),
        content: userMessage,
        role: "user",
      };
      setMessages((prev) => [...prev, newUserMessage]);

      // 创建新的 AI 消息占位
      const newAiMessage: Message = {
        id: Date.now() + 1,
        content: "",
        role: "ai",
      };
      setMessages((prev) => [...prev, newAiMessage]);

      let finalPrompt = userMessage;
      if (webEnabled) {
        const cityMatch = userMessage.match(/[(\u4e00-\u9fa5]{2,}市?/);
        const city = cityMatch ? cityMatch[0].replace(/市$/, "") : null;

        if (city) {
          try {
            const attractionsResponse = await fetch("/api/tripadvisor", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ city }),
            });

            if (attractionsResponse.ok) {
              const attractions = await attractionsResponse.json();
              if (!attractions.error) {
                finalPrompt = `用户想了解${city}的旅游信息。

这是${city}的主要景点数据：
${attractions.map((a: any) => `- ${a.name}`).join("\n")}

请按照系统提示的格式回复，先简要介绍${city}，然后列出这些景点。`;
              }
            }
          } catch (error) {
            console.error("获取景点数据失败:", error);
          }
        }
      }

      // 调用 AI 接口
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
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse =
        data.choices[0]?.message?.content || "抱歉，我无法生成回复。";

      // 更新 AI 消息内容
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === "ai") {
          lastMessage.content = aiResponse;
        }
        return newMessages;
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === "ai") {
          lastMessage.content = "抱歉，处理您的请求时出现错误。请稍后重试。";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ModelSelector = () => (
    <select
      value={selectedModel}
      onChange={(e) => setSelectedModel(e.target.value)}
      className="rounded-md border p-2 mb-4"
    >
      <option value="gpt-4">GPT-4</option>
      <option value="claude-3">Claude 3</option>
      <option value="gemini-pro">Gemini Pro</option>
      {/* 添加其他模型选项 */}
    </select>
  );

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
