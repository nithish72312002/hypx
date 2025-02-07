import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useActiveAccount, useActiveWallet, useDisconnect, useProfiles } from 'thirdweb/react';
import { client } from '@/constants/thirdweb';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Blobbie } from "thirdweb/react";


const ProfileScreen = () => {
  const account = useActiveAccount();
  const { data: profiles } = useProfiles({ client });
  
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  
  useEffect(() => {
    if (!account?.address) {
      router.replace('/loginpage');
    }
  }, [account?.address]);

  // If no account, don't render anything while redirecting
  if (!account?.address) {
    return null;
  }

  const truncatedAddress = `${account.address.substring(0, 6)}...${account.address.substring(38)}`;
  
 

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      // You could add a toast or alert here to show success
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Account Center',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
        }} 
      />

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
          <Blobbie address={account?.address} style={styles.avatar} />
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>✎</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.infoValue}>{truncatedAddress}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(account.address)}
              >
                <Ionicons name="copy-outline" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {profiles?.[0] && (
            <>
              {/* Only show type for non-standard login methods */}
              {profiles[0].type !== 'google' && 
               profiles[0].type !== 'email' && 
               profiles[0].type !== 'phone' && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.infoValue}>
                      {profiles[0].type.charAt(0).toUpperCase() + profiles[0].type.slice(1)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Show email if available */}
              {profiles[0].details?.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.infoValue}>{profiles[0].details.email}</Text>
                    <TouchableOpacity 
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(profiles[0].details.email)}
                    >
                      <Ionicons name="copy-outline" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Show phone if available */}
              {profiles[0].details?.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.infoValue}>{profiles[0].details.phone}</Text>
                    <TouchableOpacity 
                      style={styles.copyButton}
                      onPress={() => copyToClipboard(profiles[0].details.phone)}
                    >
                      <Ionicons name="copy-outline" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuIcon}>👑</Text>
            <Text style={styles.menuText}>VIP Privilege</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.statusRegular}>Regular</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuIcon}>✓</Text>
            <Text style={styles.menuText}>Verifications</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.statusVerified}>Verified</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Security</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/link-profile')}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuIcon}>🔗</Text>
            <Text style={styles.menuText}>Link Account</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.statusUnlinked}>Unlinked</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>
        
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.logoutButton} onPress={() => disconnect(wallet)}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  avatarText: {
    fontSize: 24,
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 20,
    color: '#666',
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  logoutButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRegular: {
    color: '#ffa500',
    marginRight: 8,
  },
  statusVerified: {
    color: '#00c853',
    marginRight: 8,
  },
  statusUnlinked: {
    color: '#999',
    marginRight: 8,
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    marginTop: 'auto',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
});

export default ProfileScreen;
