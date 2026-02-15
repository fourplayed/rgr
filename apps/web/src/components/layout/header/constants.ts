import { Notification } from './types';

/**
 * Mock notifications data
 * In production, this should be replaced with API calls
 */
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: 'Maintenance Due',
    message: 'Truck #103 service required',
    time: '5m ago',
  },
  {
    id: 2,
    title: 'Asset Scanned',
    message: 'Trailer #205 checked in at Depot A',
    time: '15m ago',
  },
  {
    id: 3,
    title: 'Report Ready',
    message: 'Weekly fleet report available',
    time: '1h ago',
  },
];
