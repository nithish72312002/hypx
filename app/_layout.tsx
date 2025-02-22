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
import Toast from 'react-native-toast-message';

import { useColorScheme } from "@/hooks/useColorScheme";
import { client } from "@/constants/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import AppInitializer from "@/components/AppInitializer";
import { HyperliquidProvider } from "@/context/HyperliquidContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'expo-status-bar';
import { CustomToast } from '@/components/CustomToast';

// Toast config
const toastConfig = {
  success: (props: any) => <CustomToast {...props} />,
  error: (props: any) => <CustomToast {...props} />,
};

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
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThirdwebProvider>
					<AutoConnect client={client}/>
					<HyperliquidProvider>
					<StatusBar 
						style="light"
						backgroundColor="#1A1C24" 
						translucent
					/>
						<AppInitializer>
							<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
								<Stack screenOptions={{
									headerBackTitle: "Back",
									headerShown: true,
									headerStyle: {
										backgroundColor: '#1A1C24',
									},
									headerTintColor: '#fff',
									
								}}>
									<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
								
									<Stack.Screen name="loginpage" options={{ 
										headerShown: true,
										title: "",
										headerBackVisible: true,
										headerBackTitle: "Back",
										presentation: 'card',
										animation: 'slide_from_right',
										navigationBarColor: '#1A1C24',
									}} />
									<Stack.Screen name="profile/index" options={{ 
										headerShown: true,
										headerBackTitle: "Back",

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
				<Toast config={toastConfig} />
			</SafeAreaProvider>
		</GestureHandlerRootView>		
	);
}