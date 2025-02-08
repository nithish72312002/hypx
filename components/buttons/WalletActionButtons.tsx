import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DepositButton } from './DepositButton';
import { WithdrawButton } from './WithdrawButton';
import { TransferButton } from './TransferButton';

const WalletActionButtons: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <DepositButton />
        <WithdrawButton />
        <TransferButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});

export default WalletActionButtons;
