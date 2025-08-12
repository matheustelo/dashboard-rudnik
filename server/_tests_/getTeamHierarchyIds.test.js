jest.mock('pg', () => {
  const mPool = { query: jest.fn(), on: jest.fn() }
  return { Pool: jest.fn(() => mPool) }
})

const { getTeamHierarchyIds, pool } = require('../index')

describe('getTeamHierarchyIds', () => {
  it('retrieves ids using a single recursive query', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 2 }, { id: 3 }, { id: 4 }] })

    const ids = await getTeamHierarchyIds(1)

    expect(pool.query).toHaveBeenCalledTimes(1)
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1])
    expect(ids).toEqual([2, 3, 4])
  })
})