import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight } from '../../theme/spacing';

export default function MaintenanceScreen() {
  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={colors.gradientStart}
      end={colors.gradientEnd}
      style={styles.container}
    >
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.header}>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.subtitle}>Track service and repairs</Text>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="construct-outline" size={64} color={colors.chrome} />
          </View>
          <Text style={styles.emptyText}>Coming Soon</Text>
          <Text style={styles.emptySubtext}>
            Maintenance tracking and service history will be available here
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.chrome,
    marginTop: spacing.xs,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.chrome,
    textAlign: 'center',
    lineHeight: 20,
  },
});
