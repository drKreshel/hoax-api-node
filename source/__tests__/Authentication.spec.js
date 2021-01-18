const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const { User } = require('../src/associations');
const { Token } = require('../src/associations');
// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
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

const postAuthentication = (
  credentials = { email: 'user1@mail.com', password: 'P4ssword' },
  options = { language: 'en' }
) => {
  return request(app).post('/api/1.0/auth').set('Accept-Language', options.language).send(credentials); // "send" is to emulate data sent through req.body
};

const postLogout = (options = {}) => {
  const agent = request(app).post(`/api/1.0/logout/${options.id}`);
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User authentication', () => {
  it('returns status "200" ok when credentials are correct', async () => {
    await postUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(200);
  });

  it('returns id, username and session token on login success', async () => {
    const user = await postUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
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
    await postUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'incorrect password' });
    expect(response.status).toBe(401);
  });

  it('returns status "403 forbidden" logging in with inactive account', async () => {
    await postUser({ inactive: true });
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(403);
  });

  it('returns proper error body when user is inactive', async () => {
    await postUser({ inactive: true });
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
      await postUser({ inactive: true });
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
    const response = await postAuthentication({ email: null });
    expect(response.body.validationErrors).not.toBeUndefined();
  });

  it('returns token in response body when credentials are valid', async () => {
    await postUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.token).not.toBeUndefined();
  });
});

describe('Logout', () => {
  it('returns "204" -ok no content- when logout request without auth header is received', async () => {
    const response = await postLogout();
    expect(response.status).toBe(204);
  });

  it('removes the session token from the database', async () => {
    const user = await postUser();
    const response = await postAuthentication();
    const token = response.body.token;
    await postLogout({ id: user.id, token });
    const dbToken = await Token.findOne({ where: { token } });
    expect(dbToken).toBeNull();
  });

  it('returns "403" forbidden when invalid token is sent', async () => {
    const user = await postUser();
    await postAuthentication();
    const response = await postLogout({ id: user.id, token: 'invalid-token' });
    expect(response.status).toBe(403);
  });
});

describe('Token expiration', () => {
  const putUser = async (id, body, token) => {
    const agent = request(app).put(`/api/1.0/users/${id}`);
    if (token) {
      agent.set('Authorization', `Bearer ${token}`);
    }
    return agent.send(body);
  };

  it('returns "403" forbidden when token was not used for more than one week', async () => {
    const user = await postUser();

    const token = 'test-token';
    const oneWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 + 1));
    Token.create({ token, userId: user.id, lastUsedAt: oneWeekAgo });

    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(user.id, validUpdate, token);
    expect(response.status).toBe(403);
  });

  it('refreshes "lastUsedAt" field when unexpired token is used', async () => {
    const user = await postUser();

    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({ token, userId: user.id, lastUsedAt: fourDaysAgo });

    const validUpdate = { username: 'user1-updated' };
    const timeRightBeforeUpdate = new Date();
    await putUser(user.id, validUpdate, token);
    const dbToken = await Token.findOne({ where: { token } });
    expect(dbToken.lastUsedAt.getTime()).toBeGreaterThan(timeRightBeforeUpdate.getTime());
  });

  it('refreshes "lastUsedAt" field when unexpired token is used for any endpoint request', async () => {
    const user = await postUser();

    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({ token, userId: user.id, lastUsedAt: fourDaysAgo });

    const timeRightBeforeRequest = new Date();
    await request(app).get('/api/1.0/users/5').set('Authorization', `Bearer ${token}`);
    const dbToken = await Token.findOne({ where: { token } });
    expect(dbToken.lastUsedAt.getTime()).toBeGreaterThan(timeRightBeforeRequest.getTime());
  });
});
