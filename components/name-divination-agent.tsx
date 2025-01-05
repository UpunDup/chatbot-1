import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
};

type NameDivinationProps = {
  messages: Message[];
  onComplete: (content: string) => void;
};

const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "THUDM/glm-4-9b-chat",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
};

const NAME_DIVINATION_PROMPT = `你是一个专业的姓名占卜师，负责对用户的姓名进行详细的解析和占卜。请使用markdown格式输出分析结果，你的分析需要包含以下要素：

1. 使用二级标题(##)展示用户的姓名
2. 使用三级标题(###)分别展示以下分析内容：
   - 姓氏寓意
   - 名字寓意
   - 五行属性
   - 姓名评分
   - 事业影响
   - 感情影响
3. 使用markdown列表、加粗、引用等格式优化排版
4. 在开头使用引用格式(>)展示用户的基本信息

示例格式：
> 姓名：张三
> 性别：男

## 姓名解析

### 姓氏寓意
- **张**：...（解释姓氏的来源和含义）

### 名字寓意
- **三**：...（解释名字的含义和特点）

### 五行属性
1. 姓氏五行：**金**
2. 名字五行：**木**
3. 五行搭配：...

### 姓名评分
- 整体评分：**88分**
- 优点：...
- 建议：...`;

const NameDivinationAgent: React.FC<NameDivinationProps> = ({
  messages,
  onComplete,
}) => {
  const [divination, setDivination] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const isGeneratingRef = useRef(false);

  const generateDivination = async () => {
    if (
      isGeneratingRef.current ||
      messages.length === 0 ||
      messages[messages.length - 1].id === lastMessageId
    )
      return;

    isGeneratingRef.current = true;
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .map((msg) => `${msg.role === "user" ? "用户" : "AI"}: ${msg.content}`)
        .join("\n");

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
              content: NAME_DIVINATION_PROMPT,
            },
            {
              role: "user",
              content: `请分析以下对话，提取用户姓名并进行姓名占卜:\n\n${conversationHistory}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.9,
          presence_penalty: 0.3,
          frequency_penalty: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error("姓名占卜生成失败");
      }

      const data = await response.json();
      const divinationText =
        data.choices[0]?.message?.content || "无法生成姓名占卜分析";
      setDivination(divinationText);
      onComplete(divinationText);

      if (messages.length > 0) {
        setLastMessageId(messages[messages.length - 1].id);
      }
    } catch (error) {
      console.error("姓名占卜生成错误:", error);
      setDivination("姓名占卜生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    generateDivination();
  }, [messages]);

  return (
    <div className="divination-card bg-gradient-to-br from-purple-50 to-purple-100">
      <h3 className="text-lg font-medium text-purple-900 mb-4">姓名占卜</h3>
      {isLoading ? (
        <p className="text-purple-600">正在进行姓名占卜分析...</p>
      ) : (
        <div className="prose prose-purple prose-sm max-w-none">
          <ReactMarkdown>{divination}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default NameDivinationAgent;
