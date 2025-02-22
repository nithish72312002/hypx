import { StyleSheet, Platform, StatusBar, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';

interface CustomSafeAreaProps {
  children: React.ReactNode;
  style?: any;
}

const styles = StyleSheet.create({
  AndroidSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  }
});

export const CustomSafeArea: React.FC<CustomSafeAreaProps> = ({ children, style }) => {
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView edges={['top']} style={style}>
        {children}
      </SafeAreaView>
    );
  }

  // Android: use regular View with StatusBar padding
  return (
    <View style={[styles.AndroidSafeArea, style]}>
      {children}
    </View>
  );
};

export default CustomSafeArea;