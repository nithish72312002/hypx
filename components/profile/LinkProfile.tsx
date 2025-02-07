import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SocialIcon, WalletIcon, WalletName, WalletProvider, useLinkProfile } from "thirdweb/react";
import { InAppWalletSocialAuth, WalletId, createWallet } from "thirdweb/wallets";
import { Colors } from "../../constants/Colors";
import {
  authStrategies,
  chain,
  client,
  supportedWallets,
} from "../../constants/thirdweb";

interface WalletLinkButtonProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLinked?: boolean;
}

const WalletLinkButton: React.FC<WalletLinkButtonProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  isLinked = false,



}) => {
  console.log(`WalletLinkButton rendered with isLinked: ${isLinked}`);
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        console.log('WalletLinkButton pressed');
        onPress();
      }}
    >
      <View style={styles.leftContent}>
        <SocialIcon provider={icon} width={24} height={24} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rightContent}>
        <Text style={[styles.status, isLinked ? styles.linkedStatus : styles.unlinkedStatus]}>
          {isLinked ? 'Linked' : 'Unlinked'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const LinkProfile: React.FC = () => {


  
  const {
    mutate: linkProfile,
    isPending: isLinkingProfile,
    error,
  } = useLinkProfile();

  const linkSocial = (strategy: InAppWalletSocialAuth) => {
    linkProfile({
      client,
      strategy,
    });
  };

  const linkWallet = (walletId: WalletId) => {
    linkProfile({
      client,
      strategy: "wallet",
      wallet: createWallet(walletId),
      chain: chain,
    });
  };

  if (isLinkingProfile) {
    return (
      <View style={styles.profileContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.profileContainer}>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.profileContainer}>
      <Text style={styles.sectionTitle}>Link Accounts</Text>
      <View style={styles.buttonContainer}>
        {authStrategies.map((strategy) => (
          <WalletLinkButton
            icon={strategy}
            title={strategy.charAt(0).toUpperCase() + strategy.slice(1)}
            subtitle="Link your account"
            onPress={() => linkSocial(strategy)}
            key={strategy}
          />
        ))}
        {supportedWallets.map((walletId) => (
          <WalletProvider id={walletId} key={walletId}>
            <WalletLinkButton
              icon="wallet"
              title={<WalletName />}
              subtitle="Link your wallet"
              onPress={() => linkWallet(walletId)}
            />
          </WalletProvider>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    fontSize: 14,
  },
  linkedStatus: {
    color: '#00C076',
  },
  unlinkedStatus: {
    color: '#666',
  },
  profileContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  error: {
    color: Colors.error,
  },
});

export default LinkProfile;