import BottomSheet from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { Button, Text, View } from "react-native";

// Temporary test component
const TestSheet = () => {
    const sheetRef = useRef<BottomSheet>(null);
    
    return (
      <View>
        <Button title="TEST" onPress={() => sheetRef.current?.expand()} />
        <BottomSheet
          ref={sheetRef}
          snapPoints={['30%']}
          enablePanDownToClose
        >
          <View style={{ padding: 20 }}>
            <Text>Test Content</Text>
          </View>
        </BottomSheet>
      </View>
    );
  };

export default TestSheet;