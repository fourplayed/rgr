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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Mapper ──

export function mapRowToDepot(row: DepotRow): Depot {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
