import { buildQuickAcceptDefaults } from '../useDefectMaintenanceModals';

describe('buildQuickAcceptDefaults', () => {
  it('generates title from first 50 chars of description', () => {
    const result = buildQuickAcceptDefaults({
      defectId: 'd-1',
      assetId: 'a-1',
      title: 'Defect',
      description: 'Cracked taillight on left side near the bumper connection point area',
    });
    expect(result.title).toBe('Fix: Cracked taillight on left side near the bumpe');
    expect(result.priority).toBe('medium');
    expect(result.status).toBe('scheduled');
    expect(result.assetId).toBe('a-1');
  });

  it('falls back to title when description is null', () => {
    const result = buildQuickAcceptDefaults({
      defectId: 'd-1',
      assetId: 'a-1',
      title: 'Broken mirror',
      description: null,
    });
    expect(result.title).toBe('Fix: Broken mirror');
  });

  it('includes description field', () => {
    const result = buildQuickAcceptDefaults({
      defectId: 'd-1',
      assetId: 'a-1',
      title: 'Test',
      description: 'Some notes',
    });
    expect(result.description).toBe('Auto-created from defect report');
  });
});
