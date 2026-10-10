"use client";

import React from "react";

interface VerdictCardProps {
  title: string;
  description: string;
  marketPrice: string;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  title,
  description,
  marketPrice,
}) => {
  return (
    <div className="w-full bg-[#181a24] border border-[#232736] rounded-xl p-4 sm:p-5 shadow-lg shadow-black/30">
      {/* Conclusion Text */}
      <p className="text-[13px] leading-relaxed">
        <span className="text-slate-400 font-semibold">Kết luận: </span>
        <span className="text-[#eab308] font-medium">
          {title}: {description}
        </span>
      </p>

      {/* Market Price Estimate */}
      <div className="mt-2.5 text-[12.5px] text-slate-400 flex items-center gap-1.5 font-normal">
        <span>Giá thị trường ước tính:</span>
        <span className="text-slate-200 font-medium">{marketPrice}</span>
      </div>
    </div>
  );
};
