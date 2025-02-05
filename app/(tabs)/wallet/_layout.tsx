import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';

// Create scene components
import Spot from './Spot';
import FuturesLayout from './Futures';
import { useActiveAccount } from 'thirdweb/react';
import { useRouter } from 'expo-router';

const renderScene = SceneMap({
  Spot: Spot,
  Futures: FuturesLayout,
});

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState<'Spot' | 'Futures'>('Spot');
  const [index, setIndex] = useState(0);
  const  account  = useActiveAccount();
  const router = useRouter();
  useEffect(() => {
    if (!account?.address) {
      router.push('/loginpage'); // Redirect to the login page
    }
  }, [account, router]);
  const routes = [
    { key: 'Spot', title: 'Spot' },
    { key: 'Futures', title: 'Futures' },
  ];

  const handleIndexChange = (newIndex: number) => {
    setIndex(newIndex);
    setActiveTab(routes[newIndex].key as 'Spot' | 'Futures');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
        <View style={styles.tabContainer}>
          {routes.map((route, i) => (
            <TouchableOpacity
              key={route.key}
              style={[styles.tabButton, activeTab === route.key && styles.activeTab]}
              onPress={() => {
                setIndex(i);
                setActiveTab(route.key as 'Spot' | 'Futures');
              }}
            >
              <Text style={[styles.tabText, activeTab === route.key && styles.activeTabText]}>
                {route.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        

      {/* Swipeable Content Area */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        initialLayout={{ width: Dimensions.get('window').width }}
        swipeEnabled={true}
        renderTabBar={() => null} // Hide default tab bar
        style={styles.tabView}
      />
    </SafeAreaView>
  );
};




const styles = StyleSheet.create({
  scene: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabView: {
    flex: 1,
    marginHorizontal: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    marginTop:StatusBar.currentHeight,
    padding: 16,
  },
  
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    height: 40, // Add fixed height
  },
  tabButton: {
    width: '20%', // Use percentage width instead of flex:1
    paddingVertical: 8, // Reduced from 12
    borderRadius: 6, // Slightly smaller radius
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
    height: '90%', // Fixed height
  },
  tabText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    fontSize: 14, // Add explicit font size
  },
  activeTab: {
    backgroundColor: '#AB47BC',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default WalletScreen;