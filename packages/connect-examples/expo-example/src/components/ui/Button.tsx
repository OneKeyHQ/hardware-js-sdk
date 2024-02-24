import {
  Text,
  ThemeableStack,
  getTokenValue,
  styled,
  useProps,
  withStaticProperties,
} from 'tamagui';

import type { ColorTokens, FontSizeTokens, ThemeableStackProps } from 'tamagui';

export interface IButtonProps extends ThemeableStackProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'secondary' | 'tertiary' | 'primary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  color?: ColorTokens;
}

const BUTTON_VARIANTS: Record<
  Exclude<IButtonProps['variant'], undefined>,
  {
    color: ColorTokens;
    iconColor: ColorTokens;
    bg: ColorTokens;
    hoverBg: ColorTokens;
    activeBg: ColorTokens;
    focusRingColor: ColorTokens;
  }
> = {
  primary: {
    color: '$textInverse',
    iconColor: '$iconInverse',
    bg: '$bgPrimary',
    hoverBg: '$bgPrimaryHover',
    activeBg: '$bgPrimaryActive',
    focusRingColor: '$focusRing',
  },
  tertiary: {
    color: '$textSubdued',
    iconColor: '$iconSubdued',
    bg: '$transparent',
    hoverBg: '$bgHover',
    activeBg: '$bgActive',
    focusRingColor: '$focusRing',
  },
  destructive: {
    color: '$textOnColor',
    iconColor: '$iconOnColor',
    bg: '$bgCriticalStrong',
    hoverBg: '$bgCriticalStrongHover',
    activeBg: '$bgCriticalStrongActive',
    focusRingColor: '$focusRingCritical',
  },
  secondary: {
    color: '$text',
    iconColor: '$icon',
    bg: '$bgStrong',
    hoverBg: '$bgStrongHover',
    activeBg: '$bgStrongActive',
    focusRingColor: '$focusRing',
  },
};

export const getSharedButtonStyles = ({ variant, disabled, loading }: Partial<IButtonProps>) => {
  const { iconColor, color, bg, hoverBg, activeBg, focusRingColor } =
    BUTTON_VARIANTS[variant || 'secondary'];

  const sharedFrameStyles = {
    bg,
    borderWidth: '$px',
    borderColor: '$transparent',
    ...(!disabled && !loading
      ? {
          hoverStyle: { bg: hoverBg },
          pressStyle: { bg: activeBg },
          focusable: true,
          focusStyle: {
            outlineColor: focusRingColor,
            outlineStyle: 'solid',
            outlineWidth: 2,
          },
        }
      : {
          opacity: 0.5,
        }),
  };

  return {
    color,
    iconColor,
    sharedFrameStyles,
  };
};

const getSizeStyles = (size: IButtonProps['size']) => {
  const sizes = {
    small: {
      py: '$1',
      px: '$2.5',
      borderRadius: getTokenValue('$size.2'),
      textVariant: 14,
    },
    medium: {
      py: '$1.5',
      px: '$3.5',
      borderRadius: getTokenValue('$size.2'),
      textVariant: 16,
    },
    large: {
      py: '$3',
      px: '$5',
      borderRadius: getTokenValue('$size.3'),
      textVariant: 16,
    },
  };

  return sizes[size || 'medium'];
};

export const ButtonFrame = styled(ThemeableStack, {
  tag: 'button',
  role: 'button',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
});

type ISharedFrameStylesProps = {
  hoverStyle: {
    bg: ColorTokens;
  };
  pressStyle: {
    bg: ColorTokens;
  };
  focusable: boolean;
  focusStyle: {
    outlineColor: ColorTokens;
    outlineStyle: string;
    outlineWidth: number;
  };
  bg: ColorTokens;
  borderWidth: string;
  borderColor: string;
};

const ButtonComponent = ButtonFrame.styleable<IButtonProps>((props, ref) => {
  const {
    size = 'medium',
    disabled,
    loading,
    children,
    color: textColor,
    variant = 'secondary',
    ...rest
  } = useProps(props, {});

  const { py, px, borderRadius, textVariant } = getSizeStyles(size);

  const { sharedFrameStyles, iconColor, color } = getSharedButtonStyles({
    variant,
    disabled,
    loading,
  }) as {
    sharedFrameStyles: ISharedFrameStylesProps;
    iconColor: ColorTokens;
    color: ColorTokens;
  };

  return (
    <ButtonFrame
      ref={ref}
      marginVertical={variant === 'tertiary' ? '$-1' : '$0'}
      marginHorizontal={variant === 'tertiary' ? '$-2' : '$0'}
      paddingVertical={variant === 'tertiary' ? '$1' : py}
      paddingHorizontal={variant === 'tertiary' ? '$2' : px}
      borderRadius={borderRadius}
      style={{
        borderCurve: 'continuous',
      }}
      disabled={disabled || loading}
      {...sharedFrameStyles}
      hoverStyle={{
        ...sharedFrameStyles.hoverStyle,
        ...props.hoverStyle,
      }}
      focusStyle={{
        ...sharedFrameStyles.focusStyle,
        ...props.focusStyle,
      }}
      pressStyle={{
        ...sharedFrameStyles.pressStyle,
        ...props.pressStyle,
      }}
      {...rest}
    >
      <Text fontSize={textVariant as FontSizeTokens} color={textColor || color}>
        {children}
      </Text>
    </ButtonFrame>
  );
});

export const Button = withStaticProperties(ButtonComponent, {});
