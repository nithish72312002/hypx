import React, { useState, useRef, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, TextInput, TouchableOpacity, Keyboard, Animated } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Spot from "./spot";
import Perps from "./perps";
import { CustomSafeArea } from '@/components/SafeViewAndroid/SafeViewAndroid';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/store/useSearchStore';
import { useSearchFocusStore } from '@/store/useSearchFocusStore';

const MarketLayout: React.FC = () => {
  const params = useLocalSearchParams();
  const { shouldFocusSearch, setShouldFocusSearch } = useSearchFocusStore();
  const [index, setIndex] = useState(params.tab === 'perps' ? 1 : 0);
  const [routes] = useState([
    { key: "spot", title: "Spot" },
    { key: "perps", title: "Perps" },
  ]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchAnimation = useRef(new Animated.Value(1)).current;
  const { searchText, setSearchText } = useSearchStore();
  const searchInputRef = useRef<TextInput>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (shouldFocusSearch) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          animateSearchBar(true);
          setShouldFocusSearch(false);
        });
      }
    }, [shouldFocusSearch])
  );

  useEffect(() => {
    if (params.tab === 'perps') {
      setIndex(1);
    }
  }, [params.tab]);

  const animateSearchBar = (focused: boolean) => {
    Animated.spring(searchAnimation, {
      toValue: focused ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 10
    }).start(() => {
      setIsSearchFocused(focused);
    });
  };

  const searchBarFlex = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1]
  });

  const cancelButtonFlex = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0]
  });

  const cancelButtonOpacity = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  const renderScene = SceneMap({
    spot: Spot,
    perps: Perps,
  });

  const renderTabBar = (props: any) => (
    <View style={styles.tabBar}>
      {props.navigationState.routes.map((route: any, i: number) => {
        const isFocused = props.navigationState.index === i;
        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [
              styles.tabItem,
              isFocused && styles.activeTab,
              pressed && styles.pressedTab
            ]}
            onPress={() => setIndex(i)}
          >
            <Text
              style={[styles.tabText, isFocused && styles.activeTabText]}
            >
              {route.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <CustomSafeArea style={styles.container} >
      <View style={styles.searchContainer}>
        <Animated.View style={[
          styles.searchInputWrapper,
          { flex: searchBarFlex }
        ]}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => animateSearchBar(true)}
          />
        </Animated.View>
        <Animated.View style={[
          styles.cancelContainer,
          {
            flex: cancelButtonFlex,
            opacity: cancelButtonOpacity
          }
        ]}>
          {isSearchFocused && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                setIsSearchFocused(false);
                animateSearchBar(false);
                Keyboard.dismiss();
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: 360 }}
        renderTabBar={renderTabBar}
        style={styles.scene}
      />
    </CustomSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1C24",
  },
  searchContainer: {
    height: 56,
    backgroundColor: '#1A1C24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#2A2D3A',
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
  },
  cancelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    height: 40,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#F0B90B',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1C24',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    height: 40,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    maxWidth: 100,
  },
  tabText: {
    color: '#808A9D',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#F7B84B',
  },
  pressedTab: {
    opacity: 0.7,
  },
  scene: {
    flex: 1,
  },
});

export default MarketLayout;
