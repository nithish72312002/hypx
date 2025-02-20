import { View, Text, TextInput, TouchableOpacity, StyleSheet, BackHandler, ActivityIndicator } from "react-native";
import { SocialIcon, useActiveAccount } from "thirdweb/react";
import { countryList, CountryData } from "@/assets/countryData";
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useConnect } from "thirdweb/react";
import { inAppWallet, preAuthenticate } from "thirdweb/wallets/in-app";
import { client } from "@/constants/thirdweb";
import { useRouter } from "expo-router";

type LoginStep = 'input' | 'verification';
type LoginStatus = 'idle' | 'loading' | 'error' | 'success';

export default function LoginPage() {
  const router = useRouter();
  const { connect } = useConnect();
  const [input, setInput] = useState("");
  const [isPhone, setIsPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [currentStep, setCurrentStep] = useState<LoginStep>('input');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [errorMessage, setErrorMessage] = useState("");
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
    setErrorMessage("");
    setStatus('idle');
    
    const isPhoneInput = /^[0-9+\s-]*$/.test(text);
    
    if (isPhoneInput) {
      const numericOnly = text.replace(/[^0-9]/g, '');
      if (numericOnly.length <= 15) {
        setInput(text);
      }
    } else {
      setInput(text);
    }
    
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

  const validateInput = () => {
    if (!input) {
      setErrorMessage("Please enter your email or phone number");
      return false;
    }

    if (isPhone) {
      const numericOnly = input.replace(/[^0-9]/g, '');
      if (numericOnly.length < 6) {
        setErrorMessage("Please enter a valid phone number");
        return false;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        setErrorMessage("Please enter a valid email address");
        return false;
      }
    }

    return true;
  };

  const handlePreAuth = async () => {
    if (!validateInput()) return;
    
    setStatus('loading');
    setErrorMessage("");
    
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
      setStatus('success');
      setCurrentStep('verification');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || "Failed to send verification code. Please try again.");
    }
  };

  const handleVerification = async () => {
    if (!verificationCode) {
      setErrorMessage("Please enter the verification code");
      return;
    }

    setStatus('loading');
    setErrorMessage("");

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
      setStatus('success');
      router.replace("/(tabs)");
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || "Verification failed. Please try again.");
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple" | "facebook" | "guest") => {
    setStatus('loading');
    setErrorMessage("");
    
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client: client,
          strategy: provider,
        });
        return wallet;
      });
      setStatus('success');
      router.replace("/(tabs)");
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || `${provider} login failed. Please try again.`);
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
    const handleBack = () => {
      if (currentStep === 'verification') {
        setCurrentStep('input');
        setStatus('idle');
        setErrorMessage("");
        return true;
      }
      router.replace("/(tabs)");
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBack);
  }, [currentStep]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Log in</Text>

        {currentStep === 'input' ? (
          <>
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
                editable={status !== 'loading'}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, status === 'loading' && styles.buttonDisabled]}
              onPress={handlePreAuth}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.buttonText}>Next</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
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
                editable={status !== 'loading'}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, status === 'loading' && styles.buttonDisabled]}
              onPress={handleVerification}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setCurrentStep('input');
                setStatus('idle');
                setErrorMessage("");
              }}
            >
              <Text style={styles.backButtonText}>Change {isPhone ? 'phone number' : 'email'}</Text>
            </TouchableOpacity>
          </>
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {currentStep === 'input' && (
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, status === 'loading' && styles.buttonDisabled]}
              onPress={() => handleSocialLogin('google')}
              disabled={status === 'loading'}
            >
              <SocialIcon provider="google" height={20} width={20}/>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, status === 'loading' && styles.buttonDisabled]}
              onPress={() => handleSocialLogin('apple')}
              disabled={status === 'loading'}
            >
              <SocialIcon provider="apple" height={20} width={20} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        index={-1}
      >
        <View style={styles.searchContainer}>
          <BottomSheetTextInput 
            style={styles.searchInput}
            placeholder="Search country"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#808A9D"
          />
        </View>
        <BottomSheetFlatList
          data={filteredCountries}
          keyExtractor={(item) => `${item.name}_${item.code}`}
          renderItem={renderCountryItem}
          style={styles.countryList}
        />
      </BottomSheet>
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
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: "#808A9D",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#2A2D3A",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  phoneInput: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  countrySelector: {
    height: 48,
    backgroundColor: "#2A2D3A",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#1A1C24",
  },
  button: {
    height: 48,
    backgroundColor: "#00FF88",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#00FF88",
    fontSize: 14,
  },
  errorText: {
    color: "#FF3B69",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  socialButtons: {
    marginTop: 32,
    gap: 16,
  },
  socialButton: {
    flexDirection: "row",
    height: 48,
    backgroundColor: "#2A2D3A",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  socialButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3A",
  },
  searchInput: {
    height: 40,
    backgroundColor: "#2A2D3A",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#FFFFFF",
  },
  countryList: {
    backgroundColor: "#1A1C24",
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
    color: "#FFFFFF",
    fontSize: 16,
    marginRight: 12,
    width: 60,
  },
  countryName: {
    color: "#808A9D",
    fontSize: 16,
  },
});