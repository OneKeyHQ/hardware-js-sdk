import { useAppLocale } from '../../provider/AppIntlProvider';
import { Button } from './Button';

const LocaleToggleButton = () => {
  const { locale, setLocale } = useAppLocale();
  return (
    <Button
      onPress={() => {
        setLocale(locale === 'en-US' ? 'zh-CN' : 'en-US');
      }}
    >
      {locale === 'en-US' ? '中文' : 'English'}
    </Button>
  );
};

export default LocaleToggleButton;
