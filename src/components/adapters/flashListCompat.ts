// FlashList v2 is JS-only on the New Architecture used by this app.
// AutoLayoutView belonged to v1; probing for it silently disabled recycling
// on every v2 build. Keep this import path stable for existing screens.
export { FlashList } from "@shopify/flash-list";
export type { FlashListProps, ListRenderItem } from "@shopify/flash-list";
