import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface TransferButtonProps {
  onPress?: () => void;
}

export const TransferButton: React.FC<TransferButtonProps> = ({ onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/transfer');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, styles.transferButton]} 
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>Transfer</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  transferButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6B46C1',
  },
  buttonText: {
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
