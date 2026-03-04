import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';

export default function AdminLayout() {
  const router = useRouter();
  const { canAccessAdmin } = useUserPermissions();

  useEffect(() => {
    if (!canAccessAdmin) {
      router.replace('/(tabs)');
    }
  }, [canAccessAdmin, router]);

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="users" />
      <Stack.Screen name="user-detail" />
      <Stack.Screen name="create-user" />
      <Stack.Screen name="depots" />
      <Stack.Screen name="asset-admin" />
      <Stack.Screen name="create-asset" />
      <Stack.Screen name="asset-photos" />
      <Stack.Screen name="debug" />
    </Stack>
  );
}
