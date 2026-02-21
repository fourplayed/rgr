import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight } from '../../theme/spacing';

export default function MaintenanceScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.header}>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.subtitle}>Track service and repairs</Text>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyText}>Coming Soon</Text>
          <Text style={styles.emptySubtext}>
            Maintenance tracking and service history will be available here
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  containerInner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: 35,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
