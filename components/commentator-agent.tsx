import React, { useEffect, useState, useRef } from 'react';

type Message = {
  id: number;
  role: 'user' | 'ai';
  content: string;
};

type CommentatorAgentProps = {
  messages: Message[];
  onComplete: (content: string) => void;
};

// API配置复用现有的配置
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'THUDM/glm-4-9b-chat',
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || '',
};

const COMMENTATOR_SYSTEM_PROMPT = `你是一个评论员，负责对用户提供的观点进行评论。你的评论需要包含以下要素：

1.  提出与原观点相反或质疑的意见。
2.  使用阴阳怪气的语气，例如讽刺、反问、暗示等。
3.  字数限制在30字以内。
4.  添加一个表示无奈、嘲讽或不屑的emoji。

请注意避免人身攻击和过激言论。`;

<<<<<<< Updated upstream
const CommentatorAgent: React.FC<CommentatorAgentProps> = ({ messages }) => {
  const [comment, setComment] = useState<string>('');
=======
## 水瓶座

### 基本性格
- 个性特点1
- 个性特点2

### 近期运势
1. 重要时段：**3月1日至3月15日**
2. 整体运势：...

...（其他分析内容）`;

const AstrologerAgent: React.FC<AstrologerProps> = ({
  messages,
  onComplete,
}) => {
  const [prediction, setPrediction] = useState<string>("");
>>>>>>> Stashed changes
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const isGeneratingRef = useRef(false);

  const generateComment = async () => {
    if (isGeneratingRef.current || 
        messages.length === 0 || 
        messages[messages.length - 1].id === lastMessageId) return;
    
    isGeneratingRef.current = true;
    setIsLoading(true);
    
    try {
      // 将对话历史格式化为文本
      const conversationHistory = messages
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
        .join('\n');

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
              role: 'system',
              content: COMMENTATOR_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `请分析以下对话:\n\n${conversationHistory}`
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error('评论生成失败');
      }

      const data = await response.json();
<<<<<<< Updated upstream
      const commentText = data.choices[0]?.message?.content || '无法生成评论';
      setComment(commentText);
      
=======
      const predictionText =
        data.choices[0]?.message?.content || "无法生成星座运势分析";
      setPrediction(predictionText);
      onComplete(predictionText);

>>>>>>> Stashed changes
      if (messages.length > 0) {
        setLastMessageId(messages[messages.length - 1].id);
      }

    } catch (error) {
      console.error('评论生成错误:', error);
      setComment('评论生成失败，请稍后再试。');
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    generateComment();
  }, [messages]);

  return (
<<<<<<< Updated upstream
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h3 className="font-bold mb-2">评论员的思考</h3>
      {isLoading ? (
        <p className="text-gray-500">正在分析对话...</p>
      ) : (
        <p className="text-gray-700">{comment}</p>
=======
    <div className="divination-card bg-gradient-to-br from-orange-50 to-orange-100">
      <h3 className="text-lg font-medium text-orange-900 mb-4">星座运势分析</h3>
      {isLoading ? (
        <p className="text-orange-600">正在进行星座运势分析...</p>
      ) : (
        <div className="prose prose-orange prose-sm max-w-none">
          <ReactMarkdown>{prediction}</ReactMarkdown>
        </div>
>>>>>>> Stashed changes
      )}
    </div>
  );
};

export default CommentatorAgent; 