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
      
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
          <Blobbie address={account?.address} style={styles.avatar} />
          </View>
          
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
    backgroundColor: '#1A1C24',
  },
  profileCard: {
    backgroundColor: '#2A2D3A',
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
    backgroundColor: '#2A2D3A',
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 20,
    color: '#808A9D',
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
    color: '#808A9D',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
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
    backgroundColor: '#2A2D3A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B3F',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#808A9D',
  },
  menuText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRegular: {
    color: '#16C784',
    marginRight: 8,
  },
  statusVerified: {
    color: '#16C784',
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
