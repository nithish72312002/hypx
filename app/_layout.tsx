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

import { useColorScheme } from "@/hooks/useColorScheme";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import AppInitializer from "@/components/AppInitializer";
import { HyperliquidProvider } from "@/context/HyperliquidContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
		<GestureHandlerRootView>
			<SafeAreaProvider>
				<ThirdwebProvider>
					<AutoConnect client={client}/>
					<HyperliquidProvider>
						<AppInitializer>
							<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
								<Stack screenOptions={{
									headerShown: true,
								}}>
									<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
								
									<Stack.Screen name="loginpage" options={{ 
										headerShown: true,
										title: "",
										headerBackVisible: true,
										presentation: 'card',
										animation: 'slide_from_right',
										navigationBarColor: '#1A1C24',
									}} />
									<Stack.Screen name="profile/index" options={{ 
										headerShown: true,
										title: 'Profile',
										headerStyle: {
											backgroundColor: '#1A1C24',
										},
										headerTintColor: '#FFFFFF',
										headerTitleStyle: {
											color: '#FFFFFF',
										},
										navigationBarColor: '#1A1C24',
									}} />
									<Stack.Screen name="+not-found" options={{
										title: 'Oops!',
									}} />
								</Stack>
							</ThemeProvider>
						</AppInitializer>
					</HyperliquidProvider>
				</ThirdwebProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>		
	);
}