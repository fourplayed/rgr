import { eventBus, AppEvents } from '../eventBus';

afterEach(() => {
  eventBus.clear();
});

describe('eventBus', () => {
  it('fires registered callback on emit', () => {
    const cb = jest.fn();
    eventBus.on('user:logout', cb);
    eventBus.emit('user:logout');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe function prevents future callbacks', () => {
    const cb = jest.fn();
    const unsub = eventBus.on('user:logout', cb);
    unsub();
    eventBus.emit('user:logout');
    expect(cb).not.toHaveBeenCalled();
  });

  it('off() removes a specific listener', () => {
    const cb = jest.fn();
    eventBus.on('user:logout', cb);
    eventBus.off('user:logout', cb);
    eventBus.emit('user:logout');
    expect(cb).not.toHaveBeenCalled();
  });

  it('emit() with no listeners does not throw', () => {
    expect(() => eventBus.emit('user:logout')).not.toThrow();
  });

  it('fires all listeners registered on the same event', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    eventBus.on('user:logout', cb1);
    eventBus.on('user:logout', cb2);
    eventBus.emit('user:logout');
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('other listeners still fire after one throws', () => {
    const bad = jest.fn(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    eventBus.on('user:logout', bad);
    eventBus.on('user:logout', good);
    eventBus.emit('user:logout');
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });

  it('clear() removes all listeners', () => {
    const cb = jest.fn();
    eventBus.on('user:logout', cb);
    eventBus.clear();
    eventBus.emit('user:logout');
    expect(cb).not.toHaveBeenCalled();
  });

  it('AppEvents.USER_LOGOUT equals "user:logout"', () => {
    expect(AppEvents.USER_LOGOUT).toBe('user:logout');
  });

  it('emit after clear() does not fire previously registered listeners', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    eventBus.on('user:logout', cb1);
    eventBus.on('user:logout', cb2);
    eventBus.clear();
    eventBus.emit('user:logout');
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });
});
