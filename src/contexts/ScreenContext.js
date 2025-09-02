// src/contexts/ScreenContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const ScreenContext = createContext(null);

export const ScreenProvider = ({ children }) => {
  const [screenData, setScreenData] = useState(() => {
    const initial = Dimensions.get('window');
    return {
      width: Math.max(initial.width, initial.height),
      height: Math.min(initial.width, initial.height)
    };
  });

  useEffect(() => {
    const onChange = ({ window }) => {
      setScreenData({
        width: Math.max(window.width, window.height),
        height: Math.min(window.width, window.height)
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const isPhone = screenData.width < 768;
  const isSmallPhone = screenData.width < 375;
  const isLargeTablet = Math.min(screenData.width, screenData.height) >= 600;

  // Apply your working orientation logic
  useEffect(() => {
    const setOrientation = async () => {
      const { width, height } = Dimensions.get('window');
      const isTabletDevice = Math.min(width, height) >= 600;
      
      if (isTabletDevice) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.unlockAsync();
      }
    };

    setOrientation();
    
    const subscription = Dimensions.addEventListener('change', setOrientation);
    return () => {
      subscription?.remove();
      ScreenOrientation.unlockAsync();
    };
  }, []);

  console.log('Context dimensions:', screenData, 'isLargeTablet:', isLargeTablet);

  return (
    <ScreenContext.Provider value={{
      screenData,
      isPhone,
      isSmallPhone,
      isLargeTablet
    }}>
      {children}
    </ScreenContext.Provider>
  );
};

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within ScreenProvider');
  }
  return context;
};