import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
};

type AstrologerProps = {
  messages: Message[];
};

// API配置复用现有的配置
const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "THUDM/glm-4-9b-chat",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
};

const COMMENTATOR_SYSTEM_PROMPT = `你是一个专业星座占卜师，负责对获取用户的出生年月日，以及可能的出生时间，进行星座占卜。请使用markdown格式输出分析结果，你的评论需要包含以下要素：

1. 使用二级标题(##)展示用户的星座
2. 使用三级标题(###)分别展示以下分析内容：
   - 基本性格
   - 近期运势
   - 健康建议
   - 感情运势
   - 事业发展
   - 财运分析
3. 使用markdown列表、加粗、引用等格式优化排版
4. 如果用户没有提供具体的出生时间，则可以不使用时间进行占卜
5. 在开头使用引用格式(>)展示用户的基本信息

示例格式：
> 用户：张三
> 出生：1990年1月1日

## 水瓶座

### 基本性格
- 个性特点1
- 个性特点2

### 近期运势
1. 重要时段：**3月1日至3月15日**
2. 整体运势：...

...（其他分析内容）`;

const AstrologerAgent: React.FC<AstrologerProps> = ({ messages }) => {
  const [prediction, setPrediction] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const isGeneratingRef = useRef(false);

  const generatePrediction = async () => {
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
              content: COMMENTATOR_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: `请分析以下对话，提取用户信息并进行星座运势分析:\n\n${conversationHistory}`,
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
        throw new Error("星座运势生成失败");
      }

      const data = await response.json();
      const predictionText =
        data.choices[0]?.message?.content || "无法生成星座运势分析";
      setPrediction(predictionText);

      if (messages.length > 0) {
        setLastMessageId(messages[messages.length - 1].id);
      }
    } catch (error) {
      console.error("星座运势生成错误:", error);
      setPrediction("星座运势生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    generatePrediction();
  }, [messages]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h3 className="font-bold mb-2">星座运势分析</h3>
      {isLoading ? (
        <p className="text-gray-500">正在进行星座运势分析...</p>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{prediction}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default AstrologerAgent;
