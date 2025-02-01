import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Button, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const TestSheet = () => {
  const sheetRef = useRef<BottomSheet>(null);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Button
        title="TEST"
        onPress={() => sheetRef.current?.snapToIndex(0)} // Use snapToIndex instead of expand
      />
      <BottomSheet
        ref={sheetRef}
        snapPoints={['30%']}
        enablePanDownToClose
        index={-1} // Start closed
      >
        <BottomSheetView style={{ padding: 20, backgroundColor: 'white' }}>
          <Text>Test Content</Text>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default TestSheet;