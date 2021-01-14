const request = require('supertest');
const bcrypt = require('bcrypt');
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

const postUser = async ({
  username = 'user1',
  email = 'user1@mail.com',
  password = 'P4ssword',
  inactive = false,
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const putUser = ({ id = 5, body = {}, auth, language } = {}) => {
  const agent = request(app).put(`/api/1.0/users/${id}`);
  if (language) {
    agent.set('Accept-Language', language);
  }
  if (auth) {
    const { email, password } = auth;
    const str = `${email}:${password}`;
    // convert string to base 64
    const base64 = Buffer.from(str).toString('base64');
    agent.set('Authorization', `Basic ${base64}`);

    // in supertest agent you can do it like this:
    /*
      agent.auth(email, password)
    */
  }
  return agent.send(body);
};

describe('User update', () => {
  // 0
  it('returns "403" forbidden when request is sent without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  // 1 & 2
  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_user_update}
    ${'de'}  | ${de.unauthorized_user_update}
  `(
    'returns error body with message:"$message" for unauthorized request and language is set to $language',
    async ({ language, message }) => {
      const now = new Date().getTime();
      const response = await putUser({ language }).send();
      expect(response.body.message).toBe(message);
      expect(response.body.timestamp).toBeGreaterThan(now);
      expect(response.body.path).toBe('/api/1.0/users/5');
    }
  );

  // 3
  it('returns "403" forbidden when put request is sent with incorrect email', async () => {
    await postUser();
    const response = await putUser({ auth: { email: 'incorrect@mail.com', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  // 4
  it('returns "403" forbidden when put request is sent with correct credentials but for different user', async () => {
    await postUser();
    const userToBeUpdated = await postUser({ email: 'user2@mail.com', password: 'P4ssword' });
    const response = await putUser({
      id: userToBeUpdated.id,
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });

  // 5
  // from the client this should not be possible anyways
  it('returns "403" forbidden when put request is sent by inactive user with correct credentials', async () => {
    const inactiveUser = await postUser({ inactive: true });
    const response = await putUser({
      id: inactiveUser.id,
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });

  // 6
  it('returns "403" forbidden when put request is sent with incorrect password', async () => {
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      auth: { email: 'user1@mail.com', password: 'incorrect' },
    });
    expect(response.status).toBe(403);
  });

  // 7
  it('returns "200" ok when valid put request is sent from authorized user', async () => {
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name' },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  // 8
  it('updates username in database when valid update request is sent from authorized user', async () => {
    const user = await postUser();
    await putUser({
      id: user.id,
      body: { username: 'a-new-name' },
      auth: { email: user.email, password: 'P4ssword' },
    });

    const dbUser = await User.findOne({ where: { id: user.id } });
    expect(dbUser.username).toBe('a-new-name');
  });
});
