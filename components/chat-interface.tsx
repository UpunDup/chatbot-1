"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import CommentatorAgent from "@/components/commentator-agent";
import NameDivinationAgent from "@/components/name-divination-agent";
import ZiweiAstrologyAgent from "@/components/ziwei-astrology-agent";

// 定义消息类型
type Message = {
  id: number;
  content: string;
  role: "user" | "ai";
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentator, setShowCommentator] = useState(false);
  const [showNameDivination, setShowNameDivination] = useState(false);
  const [showZiweiAstrology, setShowZiweiAstrology] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    birth: "",
    time: "",
    place: "",
  });

  // 修改发送消息处理函数
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);

    const newMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    const hasRequiredInfo = checkAndUpdateUserInfo(inputValue);

    if (hasRequiredInfo) {
      // 所有必要信息都已收集到，显示分析组件
      setShowCommentator(true);
      setShowNameDivination(true);
      setShowZiweiAstrology(true);

      // 添加一个确认消息
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 2,
          role: "ai",
          content: "感谢您提供完整信息，我现在开始为您进行分析...",
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleCommentatorComplete = (content: string) => {
    // 处理评论员分析完成的回调
    console.log("评论员分析完成:", content);
  };

  const handleNameDivinationComplete = (content: string) => {
    // 处理姓名占卜完成的回调
    console.log("姓名占卜完成:", content);
  };

  const handleZiweiComplete = (content: string) => {
    // 处理紫微斗数分析完成的回调
    console.log("紫微斗数分析完成:", content);
  };

  const checkAndUpdateUserInfo = (message: string) => {
    // 更灵活的信息提取正则表达式
    const namePattern =
      /(?:我(?:叫|是|的名字(?:是|叫))|名字(?:是|叫)|叫做|叫)?([一-龥]{2,4})(?:[,，。\s]|$)/;

    // 支持更多日期格式
    const birthPattern =
      /(?:(?:出生于|生于)?(\d{4})年[在]?(?:(\d{1,2})月)?(?:(\d{1,2})[日号])?)|(?:(\d{4})\.(\d{1,2})\.(\d{1,2}))/;

    // 支持更多时间表达方式
    const timePattern =
      /(?:(?:凌晨|早上|上午|中午|下午|晚上)?(?:([0-2]?[0-9])[点时:](?:[0-5][0-9]分?)?)|([子丑寅卯辰巳午未申酉戌亥])时)/;

    // 支持更多地点表达方式
    const placePattern =
      /(?:(?:出生在|出生于|生于|在)?([一-龥]{2,20}(?:省|市|区|县))(?:[一-龥]*)?)/;

    let hasName = false;
    let hasBirth = false;
    let hasTime = false;
    let hasPlace = false;

    // 提取姓名
    const nameMatch = message.match(namePattern);
    if (nameMatch && nameMatch[1]) {
      setUserInfo((prev) => ({ ...prev, name: nameMatch[1].trim() }));
      hasName = true;
    }

    // 提取出生年月日
    const birthMatch = message.match(birthPattern);
    if (birthMatch) {
      let year, month, day;
      if (birthMatch[1]) {
        // 标准格式：YYYY年MM月DD日
        year = birthMatch[1];
        month = birthMatch[2] || "";
        day = birthMatch[3] || "";
      } else {
        // 点分格式：YYYY.MM.DD
        year = birthMatch[4];
        month = birthMatch[5];
        day = birthMatch[6];
      }
      const birthStr = `${year}年${month}${month ? "月" : ""}${day}${
        day ? "日" : ""
      }`;
      setUserInfo((prev) => ({ ...prev, birth: birthStr }));
      hasBirth = true;
    }

    // 提取出生时辰
    const timeMatch = message.match(timePattern);
    if (timeMatch) {
      let timeStr = "";
      if (timeMatch[1]) {
        // 24小时制转换为时辰
        const hour = parseInt(timeMatch[1]);
        const timeMap: { [key: number]: string } = {
          23: "子",
          0: "子",
          1: "丑",
          2: "丑",
          3: "寅",
          4: "寅",
          5: "卯",
          6: "卯",
          7: "辰",
          8: "辰",
          9: "巳",
          10: "巳",
          11: "午",
          12: "午",
          13: "未",
          14: "未",
          15: "申",
          16: "申",
          17: "酉",
          18: "酉",
          19: "戌",
          20: "戌",
          21: "亥",
          22: "亥",
        };
        timeStr = `${timeMap[hour]}时`;
      } else if (timeMatch[2]) {
        timeStr = `${timeMatch[2]}时`;
      }
      setUserInfo((prev) => ({ ...prev, time: timeStr }));
      hasTime = true;
    }

    // 提取出生地点
    const placeMatch = message.match(placePattern);
    if (placeMatch && placeMatch[1]) {
      setUserInfo((prev) => ({ ...prev, place: placeMatch[1].trim() }));
      hasPlace = true;
    }

    // 调试信息
    console.log("提取的信息:", {
      name: nameMatch?.[1],
      birth: birthMatch?.[0],
      time: timeMatch?.[0],
      place: placeMatch?.[1],
      hasName,
      hasBirth,
      hasTime,
      hasPlace,
    });

    // 生成更友好的引导消息
    const generateGuideMessage = () => {
      const missingInfo = [];
      if (!hasName) missingInfo.push("姓名");
      if (!hasBirth) missingInfo.push("出生年月日");
      if (!hasTime) missingInfo.push("出生时辰");
      if (!hasPlace) missingInfo.push("出生地点");

      if (missingInfo.length > 0) {
        let guideMsg = `我还需要知道您的${missingInfo.join("、")}。\n`;
        guideMsg += "您可以用自然语言描述，比如：\n";
        guideMsg += "- 我叫张三，1990年3月15日子时出生在北京市\n";
        guideMsg += "- 我是李四，出生于1995年8月，早上8点生在上海市\n";
        guideMsg += "- 王五，2000年12月31日，下午3点，广州市";
        return guideMsg;
      }
      return null;
    };

    // 如果有缺失信息，生成引导消息
    const guideMessage = generateGuideMessage();
    if (guideMessage) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 2,
          role: "ai",
          content: guideMessage,
        },
      ]);
    }

    return hasName && hasBirth && hasTime && hasPlace;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col bg-white rounded-3xl">
      <CardContent className="flex-1 overflow-auto p-6">
        <div className="h-full">
          {messages.length === 0 ? (
            <EmptyPlaceholder />
          ) : (
            <>
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
                      className={`${
                        message.role === "user" ? "user-message" : "ai-message"
                      } whitespace-pre-wrap`}
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

              <div className="space-y-6">
                {showCommentator && (
                  <CommentatorAgent
                    messages={messages}
                    onComplete={handleCommentatorComplete}
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
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t p-4">
        <form
          onSubmit={handleSendMessage}
          className="flex w-full gap-3 items-center"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入您的姓名、出生年月日、出生地点..."
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
  );
};

export default ChatInterface;
