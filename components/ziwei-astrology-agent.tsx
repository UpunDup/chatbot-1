import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
};

type ZiweiAstrologyProps = {
  messages: Message[];
  onComplete: (content: string) => void;
};

const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "THUDM/glm-4-9b-chat",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
};

const ZIWEI_SYSTEM_PROMPT = `你是一个专业的紫微斗数占卜师，负责根据用户的出生年月日时进行紫微斗数分析。请使用markdown格式输出分析结果，你的分析需要包含以下要素：

1. 使用二级标题(##)展示用户的基本命盘信息
2. 使用三级标题(###)分别展示以下分析内容：
   - 命主主星
   - 命宫分析
   - 财帛宫分析
   - 官禄宫分析
   - 福德宫分析
   - 迁移宫分析
3. 使用markdown列表、加粗、引用等格式优化排版
4. 在开头使用引用格式(>)展示用户的基本信息

示例格式：
> 姓名：张三
> 出生：农历1990年1月1日 子时

## 紫微斗数命盘

### 命主主星
- 命宫主星：**紫微星**
- 身宫主星：**天机星**
- 主星组合寓意：...

### 命宫分析
1. 宫位特点：
   - 主星组合：...
   - 吉凶判断：...
2. 性格特质：...

### 财帛宫分析
- 宫位星曜：...
- 财运分析：...

### 官禄宫分析
1. 事业方向：...
2. 发展建议：...

### 福德宫分析
- 生活状态：...
- 健康提醒：...

### 迁移宫分析
1. 近期运势：**3月1日至3月15日**
2. 流年运程：...`;

const ZiweiAstrologyAgent: React.FC<ZiweiAstrologyProps> = ({
  messages,
  onComplete,
}) => {
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
              content: ZIWEI_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: `请分析以下对话，提取用户信息并进行紫微斗数分析:\n\n${conversationHistory}`,
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
        throw new Error("紫微斗数分析生成失败");
      }

      const data = await response.json();
      const predictionText =
        data.choices[0]?.message?.content || "无法生成紫微斗数分析";
      setPrediction(predictionText);
      onComplete(predictionText);

      if (messages.length > 0) {
        setLastMessageId(messages[messages.length - 1].id);
      }
    } catch (error) {
      console.error("紫微斗数分析生成错误:", error);
      setPrediction("紫微斗数分析生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    generatePrediction();
  }, [messages]);

  return (
    <div className="divination-card bg-gradient-to-br from-blue-50 to-blue-100">
      <h3 className="text-lg font-medium text-blue-900 mb-4">紫微斗数分析</h3>
      {isLoading ? (
        <p className="text-blue-600">正在进行紫微斗数分析...</p>
      ) : (
        <div className="prose prose-blue prose-sm max-w-none">
          <ReactMarkdown>{prediction}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default ZiweiAstrologyAgent;
