import LinkProfile from "@/components/profile/LinkProfile";
import { StyleSheet, View } from "react-native";

export default function LinkProfileScreen() {
  return (
    <View style={styles.profileContainer}>
      <LinkProfile />
    </View>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    padding: 16,
    flex: 1,
  },
});