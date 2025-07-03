import React from "react";
import { Button } from "./Button";

interface ActionButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  isLoading = false,
  loadingText = "Loading...",
  disabled = false,
  variant = "primary",
  onClick,
  className = "",
}) => {
  const variantClasses = {
    primary:
      "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl",
    secondary:
      "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-xl",
  };

  return (
    <Button
      className={`py-4 text-lg font-semibold rounded-full shadow-lg px-6 transition-all duration-200 hover:opacity-90 active:scale-95 ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};
