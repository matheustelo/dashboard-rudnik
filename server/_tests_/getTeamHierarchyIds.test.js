jest.mock('pg', () => {
  const mPool = { query: jest.fn(), on: jest.fn() }
  return { Pool: jest.fn(() => mPool) }
})

const { getTeamHierarchyIds, pool } = require('../index')

describe('getTeamHierarchyIds', () => {
  it('retrieves ids using a single recursive query', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] })

    const ids = await getTeamHierarchyIds(1)

    expect(pool.query).toHaveBeenCalledTimes(1)
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1])
    expect(ids).toEqual([1, 2, 3])
  })
})