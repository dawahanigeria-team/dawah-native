import ContinueListeningWidget from "./ContinueListeningWidget";
import type { ContinueListeningWidgetProps } from "./ContinueListeningWidget";

const EMPTY_PROPS: ContinueListeningWidgetProps = {
  hasEpisode: false,
  title: "",
  lecturer: "",
  progressSeconds: 0,
  durationSeconds: 0,
  isPlaying: false,
  updatedAt: new Date(0).toISOString(),
};

let lastFingerprint = "";

const toFingerprint = (props: ContinueListeningWidgetProps) =>
  JSON.stringify([
    props.hasEpisode,
    props.title,
    props.lecturer,
    Math.floor(props.progressSeconds),
    Math.floor(props.durationSeconds),
    props.isPlaying,
  ]);

export const syncContinueListeningWidget = (
  partial: Partial<ContinueListeningWidgetProps>,
) => {
  const props: ContinueListeningWidgetProps = {
    ...EMPTY_PROPS,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  const fingerprint = toFingerprint(props);
  if (fingerprint === lastFingerprint) {
    return;
  }

  lastFingerprint = fingerprint;
  ContinueListeningWidget.updateSnapshot(props);
};

export const clearContinueListeningWidget = () => {
  lastFingerprint = "";
  ContinueListeningWidget.updateSnapshot({
    ...EMPTY_PROPS,
    updatedAt: new Date().toISOString(),
  });
};
