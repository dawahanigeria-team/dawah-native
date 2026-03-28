import { Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  lineLimit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type ContinueListeningWidgetProps = {
  hasEpisode: boolean;
  title: string;
  lecturer: string;
  progressSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
  updatedAt: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const formatMmSs = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

const ContinueListeningWidget = (
  props: ContinueListeningWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";

  const isDark = environment.colorScheme === "dark";
  const primaryColor = isDark ? "#FFFFFF" : "#111827";
  const secondaryColor = isDark ? "#D1D5DB" : "#4B5563";
  const accentColor = "#22C55E";

  if (!props.hasEpisode) {
    return (
      <VStack modifiers={[padding({ all: 14 })]}>
        <Text modifiers={[font({ weight: "bold", size: 16 }), foregroundStyle(primaryColor)]}>
          Continue Listening
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(secondaryColor)]}>
          Start a lecture in the app to see it here.
        </Text>
      </VStack>
    );
  }

  const duration = Math.max(0, props.durationSeconds);
  const progress = clamp(props.progressSeconds, 0, duration || props.progressSeconds);
  const progressPct = duration > 0 ? Math.round((progress / duration) * 100) : 0;
  const modeLabel = props.isPlaying ? "Playing" : "Paused";

  return (
    <VStack modifiers={[padding({ all: 14 })]}>
      <Text
        modifiers={[
          font({ weight: "bold", size: 16 }),
          foregroundStyle(primaryColor),
          lineLimit(2),
        ]}
      >
        {props.title}
      </Text>

      <Text
        modifiers={[
          font({ size: 13 }),
          foregroundStyle(secondaryColor),
          lineLimit(environment.widgetFamily === "systemSmall" ? 1 : 2),
        ]}
      >
        {props.lecturer}
      </Text>

      <Text modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(accentColor)]}>
        {modeLabel} • {progressPct}%
      </Text>

      <Text modifiers={[font({ size: 12 }), foregroundStyle(secondaryColor)]}>
        {formatMmSs(progress)} / {formatMmSs(duration)}
      </Text>
    </VStack>
  );
};

const widget = createWidget("ContinueListeningWidget", ContinueListeningWidget);

export default widget;
