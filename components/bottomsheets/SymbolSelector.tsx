import React, { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

interface SymbolSelectorProps {
  symbols: string[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({ symbols, selectedSymbol, onSelect }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '75%'], []);

  const handleSymbolPress = (symbol: string) => {
    onSelect(symbol);
    bottomSheetRef.current?.close();
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.selectorButton}
        onPress={() => bottomSheetRef.current?.expand()}
      >
        <Text style={styles.selectedSymbolText}>
          {selectedSymbol}/USDC
        </Text>
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
      >
        <FlatList
          data={symbols}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.symbolItem}
              onPress={() => handleSymbolPress(item)}
            >
              <Text style={styles.symbolText}>{item}/USDC</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.symbolList}
        />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
  },
  selectedSymbolText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSheetBackground: {
    backgroundColor: '#000',
  },
  symbolList: {
    padding: 16,
  },
  symbolItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  symbolText: {
    color: '#FFF',
    fontSize: 16,
  },
});

export default SymbolSelector;