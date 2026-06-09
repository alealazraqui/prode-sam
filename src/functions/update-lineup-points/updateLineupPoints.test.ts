import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./parseUpdateLineupPointsBody', () => ({
  parseUpdateLineupPointsBody: vi.fn(),
}));

vi.mock('./updateLineupPickPoints', () => ({
  updateLineupPickPoints: vi.fn(),
}));

describe('updateLineupPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates all parsed items in batch', async () => {
    const { parseUpdateLineupPointsBody } = await import('./parseUpdateLineupPointsBody');
    const { updateLineupPickPoints } = await import('./updateLineupPickPoints');
    vi.mocked(parseUpdateLineupPointsBody).mockReturnValue([
      { eventDay: '2026-06-15', username: 'user1', points: 3 },
      { eventDay: '2026-06-15', username: 'user2', points: 6 },
    ]);
    vi.mocked(updateLineupPickPoints).mockResolvedValue(undefined);

    const { updateLineupPoints } = await import('./updateLineupPoints');
    await updateLineupPoints([
      { eventDay: '2026-06-15', username: 'user1', points: 3 },
      { eventDay: '2026-06-15', username: 'user2', points: 6 },
    ]);

    expect(parseUpdateLineupPointsBody).toHaveBeenCalledWith([
      { eventDay: '2026-06-15', username: 'user1', points: 3 },
      { eventDay: '2026-06-15', username: 'user2', points: 6 },
    ]);
    expect(updateLineupPickPoints).toHaveBeenCalledTimes(2);
    expect(updateLineupPickPoints).toHaveBeenNthCalledWith(1, {
      eventDay: '2026-06-15',
      username: 'user1',
      points: 3,
    });
    expect(updateLineupPickPoints).toHaveBeenNthCalledWith(2, {
      eventDay: '2026-06-15',
      username: 'user2',
      points: 6,
    });
  });
});
