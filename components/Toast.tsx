import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ActivityIndicator } from 'react-native';

interface ToastProps {
  visible: boolean;
  message: string;
  type: 'loading' | 'success';
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(type === 'loading' ? 10000 : 3000), // Show longer for loading
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        {type === 'loading' ? (
          <ActivityIndicator size="small" color="#6B46C1" style={styles.icon} />
        ) : (
          <Text style={styles.icon}>✓</Text>
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '100%',
    marginTop: 20, // Increased from 10 to 40 to move it lower
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '500',
  },
});
