import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export type ToastVerticalPosition = 'top' | 'center' | 'bottom';
export type ToastHorizontalPosition = 'left' | 'center' | 'right';

interface ToastPosition {
  vertical: ToastVerticalPosition;
  horizontal: ToastHorizontalPosition;
}

interface CustomToastProps extends BaseToastProps {
  isVisible?: boolean;
}

export const CustomToast = ({ 
  text1, 
  text2, 
  props, 
  isVisible = true,
}: CustomToastProps) => {
  const isError = props?.style?.borderLeftColor === '#ff4444';
  const position = props?.position || { vertical: 'bottom', horizontal: 'center' };
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getPositionStyle = () => {
    const style: any = {
      position: 'absolute',
    };

    switch (position.vertical) {
      case 'top':
        style.top = 20;
        break;
      case 'center':
        style.top = '40%';
        break;
      case 'bottom':
        style.bottom = 20;
        break;
    }

    switch (position.horizontal) {
      case 'left':
        style.left = 20;
        break;
      case 'right':
        style.right = 20;
        break;
      case 'center':
        style.left = '50%';
        style.transform = [{ translateX: -width * 0.3 }];
        break;
    }

    return style;
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.toastContainer,
          getPositionStyle(),
          { opacity }
        ]}
      >
        <View style={[styles.content, isError && styles.errorContainer]}>
          {text1 && <Text style={styles.title}>{text1}</Text>}
          {text2 && <Text style={styles.message}>{text2}</Text>}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    width: width * 0.6,
    minWidth: 200,
    maxWidth: 300,
  },
  content: {
    backgroundColor: '#1A1C24',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#808A9D',
    textAlign: 'center',
  },
});
