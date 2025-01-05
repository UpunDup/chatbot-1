'use client'

<<<<<<< Updated upstream
import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Paperclip, Globe, Mic, Send } from 'lucide-react'
import CommentatorAgent from "@/components/commentator-agent"
=======
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, Globe, Mic, Send } from "lucide-react";
import AstrologerAgent from "@/components/commentator-agent";
import NameDivinationAgent from "@/components/name-divination-agent";
import ZiweiAstrologyAgent from "@/components/ziwei-astrology-agent";
import FinalDivinationAgent from "@/components/final-divination-agent";
>>>>>>> Stashed changes

// 定义消息类型
type Message = {
  id: number
  content: string
  role: 'user' | 'ai'
}

// 添加类型定义
type StreamChunk = {
  choices: {
    delta: {
      content?: string
    }
  }[]
}

// 添加新的类型定义
type SearchResult = {
  title: string;
  link: string;
  snippet: string;
}

// 添加配置常量
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'Qwen/Qwen2.5-7B-Instruct', // 选择您想使用的模型
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || '', // 请确保在.env.local中设置此环境变量
  searchApiUrl: '/api/search' // 我们将添加一个新的API路由来处理搜索
}

// 添加用户信息验证函数
const extractUserInfo = (text: string) => {
  // 更全面的姓名匹配模式
  const nameMatch = text.match(
    /(?:我?(?:的)?(?:名字|叫)|我是|名字[是为]|叫做?|:|\uff1a)?\s*([^\s,，。；;]{2,})/
  );

  // 更全面的出生日期匹配模式
  const birthMatch = text.match(
    /(?:出生于?|生于)?\s*(?:([0-9]{4})年[0-9]{1,2}月[0-9]{1,2}日|([0-9]{4})[./-]([0-9]{1,2})[./-]([0-9]{1,2}))/
  );

  // 更全面的出生时间匹配模式
  const timeMatch = text.match(
    /(?:凌晨|早上|上午|中午|下午|晚上)?\s*([0-9]{1,2})[点时](?:[0-9]{1,2}分钟?)?|(?:子|丑|寅|卯|辰|巳|午|未|申|酉|戌|亥)时/
  );

  // 更全面的出生地点匹配模式，支持直接地名
  const placeMatch = text.match(
    /(?:出生[在于地]|生于|在)\s*([^，。；;]*?(?:省|市|区|县|镇|村))|([^，。；;\s]+(?:省|市|区|县|镇|村))/
  );

  // 处理日期格式
  let birthDate = null;
  if (birthMatch) {
    if (birthMatch[1]) {
      birthDate = birthMatch[0]; // 使用完整匹配的日期字符串
    } else {
      // 处理 yyyy/mm/dd 格式
      birthDate = `${birthMatch[2]}年${birthMatch[3]}月${birthMatch[4]}日`;
    }
  }

  // 获取匹配的地点（支持两种匹配模式）
  const place = placeMatch?.[1] || placeMatch?.[2];

  const info = {
    name: nameMatch?.[1]?.trim(),
    birth: birthDate,
    time: timeMatch?.[0]?.trim(),
    place: place?.trim(),
  };

  // 调试输出
  console.log("原始文本:", text);
  console.log("提取结果:", info);

  return info;
};

const ChatInterface = () => {
  // 添加状态管理
<<<<<<< Updated upstream
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "LLM具体功能是什么",
      role: "ai"
    },
    {
      id: 2, 
      content: "能详细解释一下NLU的应用场景吗？",
      role: "user"
    },
    {
      id: 3,
      content: "NLU在现代技术中有广泛的应用场景：\n• 智能客服：自动理解客户询问，提供相关解答\n• 搜索引擎：理解用户搜索意图，返回相关结果\n• 语音助手：理解口头指令，执行相应操作\n• 情感分析：分析文本中的情感倾向和态度",
      role: "ai"
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isWebEnabled, setIsWebEnabled] = useState(false)
  const [commentatorMessage, setCommentatorMessage] = useState<string | null>(null)
  const [showCommentator, setShowCommentator] = useState(false)
  
=======
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isWebEnabled, setIsWebEnabled] = useState(false);
  const [commentatorMessage, setCommentatorMessage] = useState<string | null>(
    null
  );
  const [showAstrologer, setShowAstrologer] = useState(false);
  const [showNameDivination, setShowNameDivination] = useState(false);
  const [showZiweiAstrology, setShowZiweiAstrology] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    birth: "",
    time: "",
    place: "",
  });
  const [astrologyContent, setAstrologyContent] = useState("");
  const [nameDivinationContent, setNameDivinationContent] = useState("");
  const [ziweiContent, setZiweiContent] = useState("");
  const [isFinalDivinationReady, setIsFinalDivinationReady] = useState(false);

>>>>>>> Stashed changes
  // 取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 添加搜索函数
  const searchWeb = async (query: string): Promise<string> => {
    try {
      const response = await fetch(API_CONFIG.searchApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error('搜索请求失败');
      }
      
      const searchResults: SearchResult[] = await response.json();
      
      // 将搜索结果格式化为文本
      return searchResults.map(result => 
        `标题: ${result.title}\n链接: ${result.link}\n摘要: ${result.snippet}\n\n`
      ).join('---\n');
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }

  const checkAndUpdateUserInfo = (text: string) => {
    const info = extractUserInfo(text);
    const newUserInfo = {
      name: info.name || userInfo.name,
      birth: info.birth || userInfo.birth,
      time: info.time || userInfo.time,
      place: info.place || userInfo.place,
    };
    setUserInfo(newUserInfo);

    // 调试输出
    console.log("更新后的用户信息:", newUserInfo);

    // 返回是否有足够信息启动占卜（姓名和出生日期是必需的）
    return !!(newUserInfo.name && newUserInfo.birth);
  };

  const generateGuideMessage = () => {
    const missing = [];
    if (!userInfo.name) missing.push("姓名");
    if (!userInfo.birth) missing.push("出生年月日");
    if (!userInfo.place) missing.push("出生地点");

    let message = "";
    if (missing.length > 0) {
      message = `请告诉我您的${missing.join("、")}`;
      if (!userInfo.time) {
        message +=
          "。\n如果您知道出生时间，也可以告诉我，这样可以获得更精确的紫微斗数分析。";
      }
    }

    return message;
  };

  // 修改发送消息处理函数
  const handleSendMessage = async (e: React.FormEvent) => {
<<<<<<< Updated upstream
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    setShowCommentator(false)
    
    const userMessage: Message = {
      id: Date.now(),
      content: inputValue,
      role: 'user'
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    abortControllerRef.current = new AbortController()

    try {
      let messageContent = inputValue;
      let systemPrompt = '';
      
      // 如果启用了联网功能，先进行网络搜索
      if (isWebEnabled) {
        try {
          const searchResults = await searchWeb(inputValue);
          systemPrompt = `以下是关于"${inputValue}"的网络搜索结果：\n\n${searchResults}\n请根据以上搜索结果，对用户的问题"${inputValue}"进行全面的回答。`;
          messageContent = systemPrompt;
        } catch (error) {
          console.error('搜索失败:', error);
          // 如果搜索失败，回退到普通对话
          messageContent = inputValue;
        }
      }

      const response = await fetch(API_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('API请求失败')
      }

      // 创建一个新的AI消息
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: '',
        role: 'ai'
      }
      setMessages(prev => [...prev, aiMessage])

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) {
          setShowCommentator(true)
          break;
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6))
              const content = data.choices[0]?.delta?.content || ''
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: msg.content + content }
                  : msg
              ))
            } catch (e) {
              console.error('解析响应数据失败:', e)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('发送消息失败:', error)
        // 添加错误提示消息
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          content: '抱歉，发送消息时出现错误。',
          role: 'ai'
        }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
=======
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    const hasRequiredInfo = checkAndUpdateUserInfo(inputValue);

    if (!hasRequiredInfo) {
      // 如果信息不完整，添加引导消息
      const guideMessage: Message = {
        id: messages.length + 2,
        role: "ai",
        content: generateGuideMessage(),
      };
      setMessages((prev) => [...prev, guideMessage]);
      return;
    } else {
      // 如果信息完整，启动占卜功能
      setShowAstrologer(true);
      setShowNameDivination(true);
      setShowZiweiAstrology(true);
    }
  };

  const handleAstrologyComplete = (content: string) => {
    console.log("星座占卜完成，内容:", content.substring(0, 50) + "...");
    setAstrologyContent(content);
    checkAllDivinations();
  };

  const handleNameDivinationComplete = (content: string) => {
    console.log("姓名占卜完成，内容:", content.substring(0, 50) + "...");
    setNameDivinationContent(content);
    checkAllDivinations();
  };

  const handleZiweiComplete = (content: string) => {
    console.log("紫微斗数完成，内容:", content.substring(0, 50) + "...");
    setZiweiContent(content);
    checkAllDivinations();
  };

  const checkAllDivinations = () => {
    console.log("检查占卜状态:", {
      astrology: astrologyContent.length > 0,
      name: nameDivinationContent.length > 0,
      ziwei: ziweiContent.length > 0,
    });

    if (astrologyContent && nameDivinationContent && ziweiContent) {
      console.log("所有占卜已完成，启动最终占卜");
      setIsFinalDivinationReady(true);
>>>>>>> Stashed changes
    }
  }

  return (
<<<<<<< Updated upstream
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col">
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="AI Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="User Avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
        {showCommentator && messages.length > 0 && (
          <CommentatorAgent messages={messages} />
        )}
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-center">
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
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
            variant={isWebEnabled ? "default" : "outline"} 
            size="icon" 
            type="button" 
            disabled={isLoading}
            onClick={() => setIsWebEnabled(!isWebEnabled)}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
            <Mic className="h-4 w-4" />
          </Button>
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

export default ChatInterface
=======
    <div className="chat-container">
      <Card className="flex-1 flex flex-col bg-white rounded-3xl shadow-lg">
        <CardContent className="flex-1 overflow-auto p-6 space-y-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "items-start"
                }`}
              >
                {message.role === "ai" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src="/ai-avatar.png" alt="AI" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={
                    message.role === "user" ? "user-message" : "ai-message"
                  }
                >
                  {message.content}
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src="/user-avatar.png" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>

          {/* 占卜组件容器 */}
          <div className="space-y-6">
            {showAstrologer && (
              <AstrologerAgent
                messages={messages}
                onComplete={handleAstrologyComplete}
              />
            )}

            {showNameDivination && (
              <NameDivinationAgent
                messages={messages}
                onComplete={handleNameDivinationComplete}
              />
            )}

            {showZiweiAstrology && (
              <ZiweiAstrologyAgent
                messages={messages}
                onComplete={handleZiweiComplete}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t p-4">
          <form
            onSubmit={handleSendMessage}
            className="flex w-full gap-3 items-center"
          >
            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={isLoading}
              className="rounded-xl hover:bg-gray-100"
            >
              <Paperclip className="h-5 w-5 text-gray-500" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 rounded-xl border-gray-200 focus:border-primary/50 focus:ring-primary/50"
              disabled={isLoading}
            />

            <Button
              type="submit"
              size="icon"
              disabled={isLoading}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};
>>>>>>> Stashed changes

