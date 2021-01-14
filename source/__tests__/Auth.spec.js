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

const postAndGetUser = async ({
  username = 'user1',
  email = 'user1@mail.com',
  password = 'P4ssword',
  inactive = false,
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const postAuthentication = (credentials = {}, options = { language: 'en' }) => {
  return request(app).post('/api/1.0/auth').set('Accept-Language', options.language).send(credentials); // "send" is to emulate data sent through req.body
};

describe('User authentication', () => {
  it('returns status "200" ok when credentials are correct', async () => {
    await postAndGetUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(200);
  });

  it('returns only id and username on login success', async () => {
    const user = await postAndGetUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });

  it('returns status "401" when user does not exists', async () => {
    const response = await postAuthentication({ email: 'unexistant@mail.com', password: 'unknown' });
    expect(response.status).toBe(401);
  });

  // we don't want to send many information as an ill-intend user might be trying to access with fake credentials
  it('returns proper error body when authentication fails', async () => {
    const now = new Date().getTime();
    const response = await postAuthentication({ email: 'unexistant@mail.com', password: 'unknown' });
    expect(response.body.path).toBe('/api/1.0/auth');
    expect(response.body.timestamp).toBeGreaterThan(now);
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
  });

  // here we start testing messages with internalization
  it.each`
    language | message
    ${'en'}  | ${en.authentication_failure}
    ${'de'}  | ${de.authentication_failure}
  `(
    'returns "$message" when authentication fails and language is set as "$language"',
    async ({ message, language }) => {
      const response = await postAuthentication(
        { email: 'unexistant@mail.com', password: 'unknown' },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );

  it('returns status "401" when password is incorrect', async () => {
    await postAndGetUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'incorrect password' });
    expect(response.status).toBe(401);
  });

  it('returns status "403 forbidden" logging in with inactive account', async () => {
    await postAndGetUser({ inactive: true });
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(403);
  });

  it('returns proper error body when user is inactive', async () => {
    await postAndGetUser({ inactive: true });
    const now = new Date().getTime();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.path).toBe('/api/1.0/auth');
    expect(response.body.timestamp).toBeGreaterThan(now);
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'en'}  | ${en.inactive_authentication_failure}
    ${'de'}  | ${de.inactive_authentication_failure}
  `(
    'returns "$message" when user is inactive and language is set as "$language"',
    async ({ message, language }) => {
      await postAndGetUser({ inactive: true });
      const response = await postAuthentication(
        { email: 'user1@mail.com', password: 'P4ssword' },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 400 when email is not valid', async () => {
    const response = await postAuthentication({ email: 'invalidMail', password: 'P4ssword' });
    expect(response.status).toBe(400);
  });

  it('returns 400 when a field is null', async () => {
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occurs in login form', async () => {
    const response = await postAuthentication();
    expect(response.body.validationErrors).not.toBeUndefined();
  });
});
