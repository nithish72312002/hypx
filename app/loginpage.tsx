import { View, Text, TextInput, TouchableOpacity, StyleSheet, BackHandler } from "react-native";
import { SocialIcon, useActiveAccount } from "thirdweb/react";
import { countryList, CountryData } from "@/assets/countryData";
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useConnect } from "thirdweb/react";
import { inAppWallet, preAuthenticate } from "thirdweb/wallets/in-app";
import { client } from "@/constants/thirdweb";
import { useRouter } from "expo-router";

export default function LoginPage() {
  const router = useRouter();
  const { connect } = useConnect();
  const [input, setInput] = useState("");
  const [isPhone, setIsPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(countryList[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState<CountryData[]>(countryList);
  const account = useActiveAccount();
  const address = account?.address;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  useEffect(() => {
    if (address) {
      router.replace("/(tabs)");
    }
  }, [address]);
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setSearchQuery('');
      setFilteredCountries(countryList);
    }
  }, []);

  const handleOpenPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleInputChange = (text: string) => {
    // Check if input contains only numbers, +, -, or spaces
    const isPhoneInput = /^[0-9+\s-]*$/.test(text);
    
    if (isPhoneInput) {
      // Remove all non-numeric characters for length check
      const numericOnly = text.replace(/[^0-9]/g, '');
      
      // Limit to 15 digits (maximum length of phone numbers worldwide)
      if (numericOnly.length <= 15) {
        setInput(text);
      }
    } else {
      setInput(text);
    }

    // Only show country selector if there's input and it's a phone number
    setIsPhone(isPhoneInput && text.length > 0);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = countryList.filter(country => 
      country.name.toLowerCase().includes(query.toLowerCase()) ||
      country.code.includes(query)
    );
    setFilteredCountries(filtered);
  };

  const handleSocialLogin = async (provider: "google" | "apple" | "facebook" | "guest") => {
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client: client,
          strategy: provider,
        });
        return wallet;
      });
      router.replace("/(tabs)");
    } catch (error) {
      console.error(`${provider} login failed:`, error);
    }
  };

  const handlePreAuth = async () => {
    if (!input) return;
    
    try {
      await preAuthenticate({
        client: client,
        strategy: isPhone ? "phone" : "email",
        ...(isPhone ? { 
          phoneNumber: `+${selectedCountry.code.replace(/[^0-9]/g, '')}${input.replace(/[^0-9]/g, '')}` 
        } : { 
          email: input 
        }),
      });
      setIsVerifying(true);
    } catch (error) {
      console.error("Failed to send verification code:", error);
    }
  };

  const handleVerification = async () => {
    if (!input || !verificationCode) return;

    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client: client,
          strategy: isPhone ? "phone" : "email",
          ...(isPhone ? {
            phoneNumber: `+${selectedCountry.code.replace(/[^0-9]/g, '')}${input.replace(/[^0-9]/g, '')}`,
            verificationCode,
          } : {
            email: input,
            verificationCode,
          }),
        });
        return wallet;
      });
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const renderCountryItem = useCallback(({ item }: { item: CountryData }) => (
    <TouchableOpacity 
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        handleClosePress();
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryCode}>{item.code}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
    </TouchableOpacity>
  ), []);

  // Handle back navigation
  useEffect(() => {
    const unsubscribe = () => {
      router.replace("/(tabs)");
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', unsubscribe);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', unsubscribe);
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Log in</Text>

        <Text style={styles.label}>Email/Phone number</Text>
        <View style={styles.inputContainer}>
          {isPhone && (
            <TouchableOpacity 
              style={styles.countrySelector}
              onPress={handleOpenPress}
            >
              <Text>{selectedCountry.flag} {selectedCountry.code}</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.input, isPhone && styles.phoneInput]}
            placeholder={isPhone ? "Phone (without country code)" : "Email address"}
            value={input}
            onChangeText={handleInputChange}
            keyboardType={isPhone ? "phone-pad" : "email-address"}
            autoCapitalize="none"
            placeholderTextColor="#808A9D"
          />
        </View>

        {isVerifying && (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                placeholderTextColor="#808A9D"
                maxLength={6}
              />
            </View>
          </>
        )}

        <TouchableOpacity 
          style={styles.button} 
          onPress={isVerifying ? handleVerification : handlePreAuth}
        >
          <Text style={styles.buttonText}>
            {isVerifying ? "Verify" : "Next"}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("google")}>
          <SocialIcon provider="google" width={18} height={18} />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("apple")}>
          <SocialIcon provider="apple" width={18} height={18} />
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("facebook")}>
          <SocialIcon provider="facebook" width={18} height={18} />
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("guest")}>
          <SocialIcon provider="guest" width={18} height={18} />
          <Text style={styles.socialButtonText}>Continue as Guest</Text>
        </TouchableOpacity>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={true}
          backgroundStyle={styles.bottomSheet}
        >
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search country or code..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              placeholderTextColor="#808A9D"
            />
          </View>
          <BottomSheetFlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={item => item.isoCode}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            contentContainerStyle={styles.listContainer}
          />
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1C24",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
    color: "#FFFFFF",
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#808A9D",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#2A2D3A",
    borderRadius: 8,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: "#FFFFFF",
  },
  phoneInput: {
    flex: 1,
    paddingLeft: 10,
  },
  countrySelector: {
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: "#2A2D3A",
    justifyContent: "center",
    backgroundColor: "#2A2D3A",
  },
  button: {
    backgroundColor: "#F0B90B",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#2A2D3A",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#808A9D",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#2A2D3A",
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#FFFFFF",
  },
  bottomSheet: {
    backgroundColor: "#1A1C24",
  },
  searchBarContainer: {
    padding: 16,
    backgroundColor: "#1A1C24",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  searchBar: {
    backgroundColor: "#2A2D3A",
    padding: 12,
    borderRadius: 8,
    color: "#FFFFFF",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    color: "#FFFFFF",
    marginRight: 12,
    minWidth: 60,
  },
  countryName: {
    fontSize: 16,
    color: "#808A9D",
    flex: 1,
  },
});