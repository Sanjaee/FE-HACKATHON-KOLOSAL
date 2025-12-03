import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

interface CardLayoutProps {
  image: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  description?: string;
  facilities: string[];
  onDetailClick?: () => void;
}

const formatPrice = (value: number) =>
  `Rp${value.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

const formatSold = (count: number) => {
  if (count >= 1000) {
    const rb = Math.floor(count / 1000);
    return `${rb}rb+`;
  }
  return count.toString();
};

export const CardLayout: React.FC<CardLayoutProps> = ({
  image,
  name,
  address,
  rating,
  reviewCount,
  price,
  originalPrice,
  description,
  facilities,
  onDetailClick,
}) => {
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  return (
    <Card
      className="bg-white hover:shadow-lg p-0 transition-shadow cursor-pointer h-full flex flex-col group border-0"
      onClick={onDetailClick}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image Section - square like marketplace card */}
        <div className="relative w-full pt-[100%] overflow-hidden rounded-lg">
          <img
            src={image}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-1 left-1 rounded-sm bg-red-500 px-1.5 py-0.5">
              <span className="text-[10px] font-bold text-white">
                {discountPercent}%
              </span>
            </div>
          )}

          {/* Gratis ongkir badge */}
          <div className="absolute bottom-1 left-1 rounded-sm bg-emerald-500 px-1.5 py-0.5">
            <span className="text-[9px] font-semibold text-white">
              GRATIS ONGKIR
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-2.5 pt-2.5 pb-3 flex flex-col flex-1">
          {/* Product Name */}
          <h3 className="text-[13px] font-normal text-gray-900 mb-1.5 line-clamp-2 min-h-[36px]">
            {name}
          </h3>

          {/* Price block */}
          <div className="mb-1.5">
            <div className="text-[13px] font-bold text-gray-900">
              {formatPrice(price)}
            </div>
            {hasDiscount && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-gray-400 line-through">
                  {formatPrice(originalPrice!)}
                </span>
              </div>
            )}
          </div>

          {/* Rating & sold */}
          <div className="mt-auto flex items-center text-[11px] text-gray-600 gap-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span>{rating.toFixed(1)}</span>
            <span className="text-gray-400">•</span>
            <span>{formatSold(reviewCount)} terjual</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CardLayout;
