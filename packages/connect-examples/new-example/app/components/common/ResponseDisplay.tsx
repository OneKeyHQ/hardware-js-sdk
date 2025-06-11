import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiResponse } from "../../types/hardware";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";

interface ResponseDisplayProps {
  response: ApiResponse | null;
  title?: string;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  response,
  title,
}) => {
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!response) {
    return null;
  }

  const handleCopyToClipboard = () => {
    const responseText = JSON.stringify(response, null, 2);
    navigator.clipboard.writeText(responseText).then(
      () => {
        setCopySuccess("Copied!");
        setTimeout(() => setCopySuccess(null), 2000);
      },
      () => {
        setCopySuccess("Failed to copy");
        setTimeout(() => setCopySuccess(null), 2000);
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {title || t("common.response")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyToClipboard}
          className="h-8 px-2 text-xs"
        >
          {copySuccess || t("common.copy")}
        </Button>
      </CardHeader>
      <CardContent>
        {!response ? (
          <div className="text-center text-muted-foreground py-6">
            {t("common.noResponse")}
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-2">
              <div
                className={`h-3 w-3 rounded-full mr-2 ${
                  response.success ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span
                className={response.success ? "text-green-600" : "text-red-600"}
              >
                {response.success ? "Success" : "Failed"}
              </span>
            </div>

            {response.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
                <div className="font-medium text-red-800 mb-1">Error</div>
                <div className="text-sm text-red-700">{response.error}</div>
              </div>
            )}

            {response.payload && (
              <div className="mt-2">
                <div className="font-medium mb-1">Payload</div>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64">
                  {JSON.stringify(response.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseDisplay;
