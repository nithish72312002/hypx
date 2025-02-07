import { View, Text, TextInput, TouchableOpacity, StyleSheet, BackHandler } from "react-native";
import { SocialIcon } from "thirdweb/react";
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
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

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
            placeholderTextColor="#999"
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
                placeholderTextColor="#999"
                maxLength={6}
              />
            </View>
          </>
        )}

        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={isVerifying ? handleVerification : handlePreAuth}
        >
          <Text style={styles.nextButtonText}>
            {isVerifying ? "Verify" : "Next"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.orText}>or</Text>

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
          backgroundStyle={styles.bottomSheetBackground}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={handleClosePress}>
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                placeholderTextColor="#999"
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
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
  },
  countrySelector: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#000',
  },
  phoneInput: {
    paddingLeft: 12,
  },
  nextButton: {
    backgroundColor: "#fcd535",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  nextButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  orText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  socialButtonText: {
    color: '#000',
    fontSize: 16,
  },
  createAccountButton: {
    marginTop: 'auto',
    padding: 16,
  },
  createAccountText: {
    color: '#fcd535',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  bottomSheetContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  listContainer: {
    backgroundColor: '#fff',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    marginRight: 12,
    width: 60,
    color: '#666',
  },
  countryName: {
    fontSize: 16,
    flex: 1,
    color: '#000',
  },
});