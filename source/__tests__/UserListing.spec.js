const request = require('supertest');
const app = require('../src/app');

describe('Listing Users', () => {
  it('returns status "200" ok when there are no users in the dabatase', async () => {
    const response = await request(app).get('/api/1.0/users');
    expect(response.status).toBe('200');
  });
});
