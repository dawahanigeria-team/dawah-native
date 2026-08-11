import { Redirect } from "expo-router";

export default function Index() {
  // Listening and browsing are available to guests. Send every first launch
  // straight to useful content; account prompts remain contextual (downloads,
  // follows, favourites and subscription) instead of blocking discovery.
  return <Redirect href="/(tabs)" />;
}
