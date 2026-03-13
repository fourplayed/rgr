import { getUserRoleColor } from '../getUserRoleColor';

describe('getUserRoleColor', () => {
  it('returns electricBlue for driver', () => {
    expect(getUserRoleColor('driver')).toBe('#00A8FF');
  });

  it('returns orange for mechanic', () => {
    expect(getUserRoleColor('mechanic')).toBe('#F59E0B');
  });

  it('returns violet for manager', () => {
    expect(getUserRoleColor('manager')).toBe('#8B5CF6');
  });

  it('returns purple for superuser', () => {
    expect(getUserRoleColor('superuser')).toBe('#A855F7');
  });
});
