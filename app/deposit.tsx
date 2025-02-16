import React from 'react';
import { Stack } from 'expo-router';
import DepositPage from '@/pages/deposit';

const Deposit = () => {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
        }}
      />
      <DepositPage />
    </>
  );
};

export default Deposit;
