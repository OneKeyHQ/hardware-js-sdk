import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../ui/Card';
import { useDeviceStore } from '../../store/deviceStore';

interface DeviceConnectionAlertProps {
  message?: string;
  className?: string;
}

export function DeviceConnectionAlert({ message, className = '' }: DeviceConnectionAlertProps) {
  const { t } = useTranslation();
  const { currentDevice } = useDeviceStore();

  if (currentDevice) {
    return null;
  }

  const displayMessage = message || t('components.deviceConnectionAlert.defaultMessage');

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardContent className="py-4">
        <div className="flex items-center space-x-2 text-yellow-800">
          <Info className="h-5 w-5" />
          <span>{displayMessage}</span>
        </div>
      </CardContent>
    </Card>
  );
}
