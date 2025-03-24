import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMedia as useTamaguiMedia } from 'tamagui';

interface MediaContextState {
  gtXs: boolean;
  gtSm: boolean;
  gtMd: boolean;
  gtLg: boolean;
}

const defaultState: MediaContextState = {
  gtXs: false,
  gtSm: false,
  gtMd: false,
  gtLg: false,
};

const MediaContext = createContext<MediaContextState>(defaultState);

export const useMedia = () => useContext(MediaContext);

export const MediaProvider = ({ children }: { children: React.ReactNode }) => {
  const tamaguiMedia = useTamaguiMedia();
  const [media, setMedia] = useState(defaultState);

  useEffect(() => {
    if (tamaguiMedia.gtLg) {
      setMedia({
        gtXs: true,
        gtSm: true,
        gtMd: true,
        gtLg: true,
      });
    } else if (tamaguiMedia.gtMd) {
      setMedia({
        gtXs: true,
        gtSm: true,
        gtMd: true,
        gtLg: false,
      });
    } else if (tamaguiMedia.gtSm) {
      setMedia({
        gtXs: true,
        gtSm: true,
        gtMd: false,
        gtLg: false,
      });
    } else if (tamaguiMedia.gtXs) {
      setMedia({
        gtXs: true,
        gtSm: false,
        gtMd: false,
        gtLg: false,
      });
    }
  }, [tamaguiMedia.gtXs, tamaguiMedia.gtSm, tamaguiMedia.gtMd, tamaguiMedia.gtLg]);

  const providerValue = useMemo(() => media, [media]);

  return <MediaContext.Provider value={providerValue}>{children}</MediaContext.Provider>;
};
