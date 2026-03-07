import { captureException, captureMessage, setUser } from '../errorReporting';

describe('errorReporting', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    errorSpy.mockClear();
    warnSpy.mockClear();
  });

  afterAll(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('captureException', () => {
    it('logs Error instances with their message', () => {
      captureException(new Error('Test error'), { source: 'test' });
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('[test] Test error');
    });

    it('logs non-Error values as strings', () => {
      captureException('string error', { source: 'test' });
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('[test] string error');
    });

    it('uses "unknown" source when no context is provided', () => {
      captureException(new Error('no context'));
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('[unknown]');
    });

    it('passes extra data when provided', () => {
      captureException(new Error('with extra'), {
        source: 'test',
        extra: { userId: '123' },
      });
      expect(errorSpy).toHaveBeenCalled();
      // In dev mode, data is passed as second argument
      expect(errorSpy.mock.calls[0]).toHaveLength(2);
    });
  });

  describe('captureMessage', () => {
    it('logs a warning-level message', () => {
      captureMessage('test warning', { source: 'scan' });
      expect(warnSpy).toHaveBeenCalled();
      const call = warnSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('[scan] test warning');
    });
  });

  describe('setUser', () => {
    it('does not throw when setting a user', () => {
      expect(() => setUser({ id: 'user-1', email: 'test@example.com' })).not.toThrow();
    });

    it('does not throw when clearing user', () => {
      expect(() => setUser(null)).not.toThrow();
    });
  });
});
