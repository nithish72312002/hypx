import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "expo-router";
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export default function TabLayout() {
  const account = useActiveAccount();
  const address = account?.address;
  const router = useRouter();

  const handleTabPress = (e: any) => {
    if (e.target?.toString().includes('Assets') && !address) {
      e.preventDefault();
      router.push("/loginpage");
    }
  };

  return (
    <BottomSheetModalProvider>
      
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1A1C24',
            borderTopColor: '#2A2D3A',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#F0B90B',
          tabBarInactiveTintColor: '#808A9D',
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 0,
          },
          headerShown: false,
        }}
        screenListeners={{
          tabPress: handleTabPress
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: "Markets",
            tabBarIcon: ({ color }) => (
              <Ionicons name="bar-chart" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trade/[symbol]"
          options={{
            title: "Trade",
            tabBarIcon: ({ color }) => (
              <Ionicons name="trending-up" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="futures/[symbol]"
          options={{
            title: "Futures",
            tabBarIcon: ({ color }) => (
              <Ionicons name="time" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Assets",
            tabBarIcon: ({ color }) => (
              <Ionicons name="wallet" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1C24',
  },
});