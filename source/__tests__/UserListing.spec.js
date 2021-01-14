const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get('/api/1.0/users');
};

const postUsers = (n, m = 0) => {
  // n: "amount of active users to post" / m: amunt of inactive users
  const usersArr = [];
  for (let i = 0; i < n + m; i += 1) {
    usersArr.push({ username: `user${i + 1}`, email: `user${i + 1}@mail.com`, inactive: i >= n });
  }
  return User.bulkCreate(usersArr, { raw: true }); // raw: akind ".lean()"" from mongodb
};

// get a user by id, default for testing: 5
const getUser = (id = 5) => {
  return request(app).get(`/api/1.0/users/${id}`);
};

describe('Listing Users', () => {
  it('returns status "200" ok when there are no users in the dabatase', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns only 10 users per page', async () => {
    await postUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns only active users', async () => {
    // we will add 6 active and 5 inactive users
    await postUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('returns only "id", "username" and "email" fields in content array for each user', async () => {
    // we don't want to show any sensitive data
    await postUsers(1);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 2 total pages when there are 15 active and 7 inactive users', async () => {
    await postUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toEqual(2);
  });

  it('returns second page of user and a "page indicator" when page is set as "1"', async () => {
    await postUsers(11);
    const response = await getUsers().query({ page: 1 }); // can also append "?page=1" to the route instead of using query
    expect(response.body.content[0].username).toEqual('user11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set below "0"', async () => {
    const response = await getUsers().query({ page: -5 });
    expect(response.body.page).toBe(0);
  });

  it('returns five users and corresponding size indicator when size is set as "5" in request', async () => {
    await postUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.size).toBe(5);
    expect(response.body.content.length).toBe(5);
  });

  it('returns 10 users as default if size is set below 0', async () => {
    await postUsers(11);
    const response = await getUsers().query({ size: -2 });
    expect(response.body.size).toBe(10);
  });

  it('returns maximum 10 users if size is larger than that', async () => {
    // prevent users to spam huge requests
    await postUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.size).toBe(10);
    expect(response.body.content.length).toBe(10);
  });

  it('returns page and size defaults when non numeric parameters are entered', async () => {
    await postUsers(11);
    const response = await getUsers().query({ size: 'very big', page: 'an important page' });
    expect(response.body.content.length).toBe(10);
    expect(response.body.page).toBe(0);
  });
});

describe('Get user', () => {
  it('returns 404 status when user is not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'de'}  | ${de.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `(
    'returns "$message" for unknown user when language is set to $language',
    async ({ language, message }) => {
      const response = await getUser().set('Accept-Language', language);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns proper error body when user is not found', async () => {
    const now = new Date().getTime();
    const response = await getUser();
    expect(response.body.path).toBe('/api/1.0/users/5');
    expect(response.body.timestamp).toBeGreaterThan(now);
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns status "200" ok when an active user exists', async () => {
    const users = await postUsers(1);
    const user = users[0];
    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it("returns id, username and email, and doesn't returns password", async () => {
    const users = await postUsers(1);
    const user = users[0];
    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email']);
    expect(Object.keys(response.body)).not.toContain('password');
  });

  it('returns status "404" when the user is inactive', async () => {
    const users = await postUsers(0, 1);
    const user = users[0];
    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});