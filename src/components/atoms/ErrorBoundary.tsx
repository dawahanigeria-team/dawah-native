import { Ionicons } from "@expo/vector-icons";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { designTokens } from "../../theme/designTokens";
import { captureSentryException, addSentryBreadcrumb } from "../../services/config/sentry.config";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Report to Sentry
    captureSentryException(error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
      level: 'error',
    });

    addSentryBreadcrumb('UI Error Boundary triggered', 'error', {
      error: error.message,
      componentStack: errorInfo.componentStack?.substring(0, 200), // Limit size
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    addSentryBreadcrumb('User retried after error', 'user', {
      previousError: this.state.error?.message,
    });
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="warning"
              size={48}
              color={designTokens.colors.semantic.orange}
              accessibilityLabel="Error warning icon"
            />
          </View>

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.message}>
            We&apos;re sorry, but something unexpected happened. Please try
            again.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>
                Error Details (Development):
              </Text>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
              <Text style={styles.errorStack}>{this.state.error.stack}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            accessibilityLabel="Retry button"
            accessibilityHint="Tap to try loading the content again"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: designTokens.spacing.xl,
    backgroundColor: designTokens.colors.system.background.primary,
  },
  iconContainer: {
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    fontSize: designTokens.typography.fontSize.title2,
    fontWeight: designTokens.typography.fontWeight.semibold,
    color: designTokens.colors.system.label.primary,
    textAlign: "center",
    marginBottom: designTokens.spacing.md,
  },
  message: {
    fontSize: designTokens.typography.fontSize.body,
    color: designTokens.colors.system.label.secondary,
    textAlign: "center",
    marginBottom: designTokens.spacing.xl,
    lineHeight:
      designTokens.typography.fontSize.body *
      designTokens.typography.lineHeight.normal,
  },
  errorDetails: {
    backgroundColor: designTokens.colors.system.background.secondary,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    marginBottom: designTokens.spacing.xl,
    width: "100%",
  },
  errorTitle: {
    fontSize: designTokens.typography.fontSize.footnote,
    fontWeight: designTokens.typography.fontWeight.semibold,
    color: designTokens.colors.semantic.red,
    marginBottom: designTokens.spacing.xs,
  },
  errorText: {
    fontSize: designTokens.typography.fontSize.caption1,
    color: designTokens.colors.system.label.secondary,
    marginBottom: designTokens.spacing.xs,
  },
  errorStack: {
    fontSize: designTokens.typography.fontSize.caption2,
    color: designTokens.colors.system.label.tertiary,
    fontFamily: designTokens.typography.fontFamily.mono,
  },
  retryButton: {
    backgroundColor: designTokens.colors.brand.primary,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    minHeight: designTokens.hitTargets.comfortable,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: designTokens.colors.system.background.primary,
    fontSize: designTokens.typography.fontSize.body,
    fontWeight: designTokens.typography.fontWeight.semibold,
  },
});
