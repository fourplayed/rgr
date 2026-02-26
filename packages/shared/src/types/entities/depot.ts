import { z } from 'zod';

/**
 * Depot — camelCase application interface
 */
export interface Depot {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DepotRow — snake_case database row type
 */
export interface DepotRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a depot
 */
export interface CreateDepotInput {
  name: string;
  code: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  color?: string | null;
  isActive?: boolean;
}

/**
 * Input for updating a depot
 */
export interface UpdateDepotInput {
  name?: string;
  code?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  color?: string | null;
  isActive?: boolean;
}

// ── Zod schemas ──

export const CreateDepotInputSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  color: z.string().max(7).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateDepotInputSchema = CreateDepotInputSchema.partial();

// ── Mappers ──

export function mapRowToDepot(row: DepotRow): Depot {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    color: row.color,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDepotToInsert(
  input: CreateDepotInput
): Record<string, unknown> {
  return {
    name: input.name,
    code: input.code,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    color: input.color ?? null,
    is_active: input.isActive ?? true,
  };
}

export function mapDepotToUpdate(
  input: UpdateDepotInput
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates['name'] = input.name;
  if (input.code !== undefined) updates['code'] = input.code;
  if (input.address !== undefined) updates['address'] = input.address;
  if (input.latitude !== undefined) updates['latitude'] = input.latitude;
  if (input.longitude !== undefined) updates['longitude'] = input.longitude;
  if (input.color !== undefined) updates['color'] = input.color;
  if (input.isActive !== undefined) updates['is_active'] = input.isActive;

  return updates;
}
