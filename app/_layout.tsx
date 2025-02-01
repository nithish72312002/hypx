import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from "@/hooks/useColorScheme";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import AppInitializer from "@/components/AppInitializer";
import { AgentWalletProvider } from "@/context/AgentWalletContext";
import { HyperliquidProvider } from "@/context/HyperliquidContext";


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
	});

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return (

		<ThirdwebProvider>
			
      <AgentWalletProvider>
			<AppInitializer	/>
			<HyperliquidProvider>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
					<Stack.Screen name="+not-found" />
				</Stack>
			</ThemeProvider>
			</HyperliquidProvider>
			</AgentWalletProvider>

		</ThirdwebProvider>

	);
}
