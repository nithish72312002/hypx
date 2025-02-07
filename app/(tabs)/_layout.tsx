import { Tabs, useRouter, usePathname } from "expo-router";
import React, { useEffect } from "react";

import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useActiveAccount } from "thirdweb/react";

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const account = useActiveAccount();
	const address = account?.address;
	const router = useRouter();
	const pathname = usePathname();

	const handleTabPress = (e: any) => {
		if (e.target?.toString().includes('wallet') && !address) {
			e.preventDefault();
			router.push("/loginpage");
		}
	};

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
				headerShown: false,
			}}
			screenListeners={{
				tabPress: handleTabPress
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Connect",
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? "wallet" : "wallet-outline"}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="market"
				options={{
					title: "market",
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? "wallet" : "wallet-outline"}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="trade/[symbol]"
				options={{
					title: "trade",
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? "reader" : "reader-outline"}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="futures/[symbol]"
				options={{
					title: "futures",
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? "reader" : "reader-outline"}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="wallet"
				options={{
					title: "wallet",
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? "code-slash" : "code-slash-outline"}
							color={color}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
