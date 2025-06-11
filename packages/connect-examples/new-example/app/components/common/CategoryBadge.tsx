import { Badge } from "~/components/ui/Badge";
import { getCategoryIcon, getCategoryColor } from "~/lib/category-utils";
import type { MethodCategory } from "~/data/types";

interface CategoryBadgeProps {
  category: MethodCategory;
  showIcon?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  showIcon = true,
  className = "",
}: CategoryBadgeProps) {
  const IconComponent = getCategoryIcon(category);
  const colorClass = getCategoryColor(category);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <div className={`p-2 rounded-lg border ${colorClass}`}>
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <Badge variant="secondary">{category}</Badge>
    </div>
  );
}
