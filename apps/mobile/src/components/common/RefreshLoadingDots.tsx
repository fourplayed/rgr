import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingDots } from './LoadingDots';
import { spacing } from '../../theme/spacing';

interface RefreshLoadingDotsProps {
  isRefetching: boolean;
}

export function RefreshLoadingDots({ isRefetching }: RefreshLoadingDotsProps) {
  if (!isRefetching) return null;
  return (
    <View style={styles.container}>
      <LoadingDots size={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
