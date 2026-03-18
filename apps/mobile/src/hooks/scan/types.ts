/** Alert sheet state — owned by scan.tsx, passed into useScanFlow and useScanProcessing. */
export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
