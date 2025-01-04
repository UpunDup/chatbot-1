"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, Globe, Mic, Send } from "lucide-react";
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
  model: "Qwen/Qwen2.5-7B-Instruct", // 选择您想使用的模型
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "", // 请确保在.env.local中设置此环境变量
};

const ChatInterface = () => {
  // 添加状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "LLM具体功能是什么",
      role: "ai",
    },
    {
      id: 2,
      content: "能详细解释一下NLU的应用场景吗？",
      role: "user",
    },
    {
      id: 3,
      content:
        "NLU在现代技术中有广泛的应用场景：\n• 智能客服：自动理解客户询问，提供相关解答\n• 搜索引擎：理解用户搜索意图，返回相关结果\n• 语音助手：理解口头指令，执行相应操作\n• 情感分析：分析文本中的情感倾向和态度",
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

      // 如果启用了联网,先获取Google搜索结果
      if (webEnabled) {
        try {
          const searchResults = await fetch("/api/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: inputValue }),
          }).then((res) => res.json());

          finalPrompt = `
基于以下搜索结果回答问题:"${inputValue}"

搜索结果:
${searchResults.join("\n")}

请用中文总结相关信息回答问题。
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
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("请求被取消");
      } else {
        console.error("发送消息失败:", error);
        // 添加错误提示消息
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
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col">
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : ""
              }`}
            >
              {message.role === "ai" && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="AI Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`flex-1 ${
                  message.role === "user" ? "max-w-[80%]" : ""
                }`}
              >
                <div
                  className={`rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted prose prose-neutral dark:prose-invert max-w-none"
                  }`}
                >
                  {message.role === "user" ? (
                    message.content
                  ) : (
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
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded"
                              {...props}
                            />
                          ) : (
                            <code {...props} />
                          ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
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
