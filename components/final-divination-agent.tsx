import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
};

type FinalDivinationProps = {
  messages: Message[];
  astrologyContent: string;
  nameDivinationContent: string;
  ziweiContent: string;
  isReady: boolean;
};

const API_CONFIG = {
  baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  model: "THUDM/glm-4-9b-chat",
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || "",
};

const FINAL_DIVINATION_PROMPT = `你是一位资深的命理大师，需要综合分析用户的星座占卜、姓名占卜和紫微斗数三项占卜结果，给出最终的综合分析。请使用markdown格式输出分析结果，你的分析需要包含以下要素：

1. 使用二级标题(##)展示"命运总览"
2. 使用三级标题(###)分别展示以下分析内容：
   - 核心命运特质（综合三种占卜的共同点）
   - 人生机遇与挑战
   - 2024年整体运势
   - 重点发展方向
   - 化解建议
3. 使用markdown列表、加粗、引用等格式优化排版
4. 特别注意分析三种占卜结果的关联性和互补性
5. 在开头使用引用格式(>)展示用户信息和分析依据

示例格式：
> 综合分析报告
> 基于：星座占卜、姓名占卜、紫微斗数`;

const FinalDivinationAgent: React.FC<FinalDivinationProps> = ({
  messages,
  astrologyContent,
  nameDivinationContent,
  ziweiContent,
  isReady,
}) => {
  const [finalDivination, setFinalDivination] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const isGeneratingRef = useRef(false);

  const generateFinalDivination = async () => {
    if (isGeneratingRef.current || !isReady) return;

    isGeneratingRef.current = true;
    setIsLoading(true);

    try {
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
              content: FINAL_DIVINATION_PROMPT,
            },
            {
              role: "user",
              content: `请综合分析以下三种占卜结果，给出最终的命理分析：

星座占卜结果：
${astrologyContent}

姓名占卜结果：
${nameDivinationContent}

紫微斗数结果：
${ziweiContent}`,
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
        throw new Error("最终占卜生成失败");
      }

      const data = await response.json();
      const divinationText =
        data.choices[0]?.message?.content || "无法生成最终占卜分析";
      setFinalDivination(divinationText);
    } catch (error) {
      console.error("最终占卜生成错误:", error);
      setFinalDivination("最终占卜生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    if (isReady) {
      generateFinalDivination();
    }
  }, [isReady, astrologyContent, nameDivinationContent, ziweiContent]);

  return (
    <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg shadow-lg mt-6 border-2 border-purple-300">
      <h3 className="text-2xl font-bold mb-4 text-purple-800 text-center">
        🔮 最终命理综合分析 🔮
      </h3>
      {isLoading ? (
        <div className="text-center">
          <p className="text-purple-600 animate-pulse">
            正在进行最终命理综合分析...
          </p>
          <p className="text-sm text-purple-400 mt-2">
            我们正在仔细分析三项占卜的关联性，请稍候...
          </p>
        </div>
      ) : (
        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-purple-800 prose-strong:text-purple-700">
          <ReactMarkdown>{finalDivination}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default FinalDivinationAgent;
