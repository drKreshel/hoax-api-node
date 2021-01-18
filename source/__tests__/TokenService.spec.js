const sequelize = require('../src/config/database');
const { Token } = require('../src/associations');
const TokenService = require('../src/auth/TokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  // we will not be having user creation on this spec, so we don't need to use cascade
  await Token.destroy({ truncate: true });
});

describe('Token cleanup', () => {
  it('cleans expired tokens with scheduled tasks', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({ token, lastUsedAt: eightDaysAgo });
    TokenService.scheduledCleanup();
    jest.runOnlyPendingTimers();
    const dbToken = await Token.findOne({ where: { token } });
    expect(dbToken).toBeNull();
  });
});
