import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { AutoConnect, useConnect } from "thirdweb/react";
import { inAppWallet, preAuthenticate } from "thirdweb/wallets/in-app";
import { client } from "@/constants/thirdweb";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function CustomLoginPage() {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const { connect, isConnecting, error } = useConnect();
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams(); // Retrieve the redirect target
  const wallet = inAppWallet();

  const sendVerificationCode = async () => {
    try {
      await preAuthenticate({
        client,
        strategy: "email",
        email,
      });
      setIsCodeSent(true);
      Alert.alert("Success", "Verification code sent to your email.");
    } catch (err) {
      console.error("Pre-login error:", err);
      Alert.alert("Error", "Failed to send verification code.");
    }
  };

  const handleEmailLogin = async () => {
    try {
      await connect(async () => {
        await wallet.connect({
          client,
          strategy: "email",
          email,
          verificationCode,
        });
        return wallet;
      });

      Alert.alert("Success", "Logged in successfully!");
      router.replace(redirectTo || "/"); // Redirect back to the previous page or home
    } catch (err) {
      console.error("Login error:", err);
      Alert.alert("Error", "Failed to log in. Please try again.");
    }
  };

  const handleGuestLogin = async () => {
    try {
      await connect(async () => {
        await wallet.connect({

          client,
          strategy: "guest",
        });
        return wallet;
      });

      Alert.alert("Success", "Logged in as guest!");
      router.replace(redirectTo || "/"); // Redirect back to the previous page or home
    } catch (err) {
      console.error("Guest login error:", err);
      Alert.alert("Error", "Failed to log in as guest. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {isCodeSent && (
        <TextInput
          style={styles.input}
          placeholder="Enter verification code"
          keyboardType="numeric"
          value={verificationCode}
          onChangeText={setVerificationCode}
        />
      )}

      {!isCodeSent ? (
        <TouchableOpacity style={styles.button} onPress={sendVerificationCode}>
          <Text style={styles.buttonText}>Send Verification Code</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleEmailLogin}>
          <Text style={styles.buttonText}>
            {isConnecting ? "Logging in..." : "Login with Email"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
        <Text style={styles.guestButtonText}>Login as Guest</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  button: {
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007bff",
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  guestButton: {
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#28a745",
    borderRadius: 8,
    marginTop: 10,
  },
  guestButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  error: {
    color: "red",
    marginTop: 10,
  },
});
