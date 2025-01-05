import React from "react";

export const EmptyPlaceholder = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="rounded-full bg-purple-100 p-4 mb-4">
        <span className="text-4xl">🔮</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        欢迎来到命理解析系统
      </h3>
      <p className="text-gray-500 max-w-sm mb-4">
        请告诉我您的姓名、出生年月日时辰和出生地点，我将为您进行详细的命理分析。
      </p>
      <div className="text-sm text-gray-400">
        <p>示例：我叫张三，1990年3月15日子时出生在北京市。</p>
      </div>
    </div>
  );
};
