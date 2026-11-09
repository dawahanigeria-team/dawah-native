import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

// The store icon has a transparent margin around its rounded square; this crop
// keeps only the artwork so it can be shown at any size with our own corners.
const ICON = require("../../../assets/images/icon.png");
const ARTWORK_SCALE = 1.27;

/** The app's real icon, used wherever the brand appears instead of a "DN" tile. */
export const AppMark: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <View
    style={[styles.frame, { width: size, height: size, borderRadius: size * 0.225 }]}
    accessible
    accessibilityRole="image"
    accessibilityLabel="dawahnigeria"
  >
    <Image
      source={ICON}
      style={{
        width: size * ARTWORK_SCALE,
        height: size * ARTWORK_SCALE,
        marginLeft: -size * ((ARTWORK_SCALE - 1) / 2),
        marginTop: -size * ((ARTWORK_SCALE - 1) / 2),
      }}
      contentFit="cover"
    />
  </View>
);

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
});
