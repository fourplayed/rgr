import { type ClassValue } from "clsx";
export declare function cn(...inputs: ClassValue[]): string;
export declare function formatCurrency(amount: number, currency?: string, options?: Intl.NumberFormatOptions): string;
export declare function generateUniqueId(prefix?: string): string;
export declare function truncateText(text: string, maxLength: number): string;
export declare function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic utility types require any for max flexibility
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic utility types require any for max flexibility
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
