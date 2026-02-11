import { FlashList as NativeFlashList } from "@shopify/flash-list";
import { FlatList, UIManager } from "react-native";

const supportsAutoLayoutView = Boolean(
  UIManager.getViewManagerConfig?.("AutoLayoutView"),
);

/**
 * FlashList can crash on some Android builds when AutoLayoutView is unavailable.
 * Fall back to FlatList so route rendering remains safe in production.
 */
export const FlashList = (
  supportsAutoLayoutView ? NativeFlashList : FlatList
) as typeof NativeFlashList;

export type { FlashListProps, ListRenderItem } from "@shopify/flash-list";
