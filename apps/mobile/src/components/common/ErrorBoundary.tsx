import React, { Component, ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import { logger } from '../../utils/logger';
import { AppText } from './AppText';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught:', { error, componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AppText style={styles.title}>Something went wrong</AppText>
          <AppText style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </AppText>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <AppText style={styles.buttonText}>Try Again</AppText>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
