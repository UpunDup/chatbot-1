import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { message, model } = await request.json();

  switch (model) {
    case "claude-3":
      // 调用 Anthropic API
      break;
    case "gemini-pro":
      // 调用 Google API
      break;
    case "gpt-4":
    default:
      // 调用 OpenAI API
      break;
  }

  // ... 处理响应并返回
}
