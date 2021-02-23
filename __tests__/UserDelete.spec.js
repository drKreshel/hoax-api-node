const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir, attachmentsDir } = require('config').directories;
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { User, Token, Hoax, FileAttachment } = require('../src/associations');
// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentsFolder = path.join('.', uploadDir, attachmentsDir);

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const user1 = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const user2 = {
  username: 'user2',
  email: 'user2@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const postUser = async ({ username, email, password, inactive } = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const loginUser = async ({ email, password }) => {
  const response = await request(app).post('/api/1.0/auth').send({ email, password });
  return response.body;
};

const deleteUser = async ({ id, token, language } = {}) => {
  console.log(id, token);
  const agent = request(app).delete(`/api/1.0/users/${id}`);

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (language) {
    agent.set('Accept-Language', language);
  }

  return agent.send();
};

describe('User delete', () => {
  // 0
  it('returns "403" forbidden when request is sent unauthorized', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  //  1 & 2
  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_user_delete}
    ${'de'}  | ${de.unauthorized_user_delete}
  `(
    'returns error body with message:"$message" for unauthorized request and language is set to $language',
    async ({ language, message }) => {
      const now = new Date().getTime();
      const response = await deleteUser({ id: 5, language });
      expect(response.body.message).toBe(message);
      expect(response.body.timestamp).toBeGreaterThan(now);
      expect(response.body.path).toBe('/api/1.0/users/5');
    }
  );

  // 3
  it('returns "403" forbidden when delete request is sent with correct credentials but for different user', async () => {
    // user 1...
    await postUser(user1);
    const { token } = loginUser(credentials);
    // ...tries to delete user 2
    const userToBeDeleted = await postUser(user2);
    const response = await deleteUser({ id: userToBeDeleted.id, token });
    expect(response.status).toBe(403);
  });

  // 4
  it('returns "403" forbidden when token is not valid', async () => {
    const response = await deleteUser({ id: 5, token: '123' });
    expect(response.status).toBe(403);
  });

  /** **************
   * Success cases
   *************** */
  // 5
  it('returns "200" ok when valid delete request is sent from authorized user', async () => {
    const user = await postUser(user1);
    const login = await loginUser(credentials);
    const response = await deleteUser({
      id: user.id,
      token: login.token,
    });
    expect(response.status).toBe(200);
  });

  // 6
  it('deletes user from database when delete request is sent from authorized user', async () => {
    const user = await postUser(user1);
    const login = await loginUser(credentials);
    await deleteUser({
      id: user.id,
      token: login.token,
    });
    const dbUser = await User.findOne({ where: { id: user.id } });
    expect(dbUser).toBeNull();
  });

  it("also deletes the user's tokens from database when delete request is sent from authorized user", async () => {
    const user = await postUser(user1);
    const login = await loginUser(credentials);
    await deleteUser({ id: user.id, token: login.token });
    const dbToken = await Token.findOne({ where: { userId: user.id } });
    expect(dbToken).toBeNull();
  });

  // user will have a token for each session he has logged in (different devices, browsers)
  it("deletes all the user's tokens from database when delete request is sent from authorized user", async () => {
    const user = await postUser(user1);
    const login1 = await loginUser(credentials);
    const login2 = await loginUser(credentials);
    // "user destroys his/her account from session with token1"
    await deleteUser({ id: user.id, token: login1.token });
    const dbToken2 = await Token.findOne({ where: { token: login2.token } });
    expect(dbToken2).toBeNull();
  });

  it('deletes hoax from database when delete user request is sent from authorized user', async () => {
    const user = await postUser(user1);
    const { token } = await loginUser(credentials);
    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hoax content' });
    // "user destroys his/her account from session with token1"
    await deleteUser({ id: user.id, token });
    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(0);
  });

  it('removes profile iamge when user is deleted', async () => {
    const user = await postUser(user1);
    const { token } = await loginUser(credentials);
    const storedFilename = 'profile-image-user1';
    const testFilepath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(profileFolder, storedFilename);
    fs.copyFileSync(testFilepath, targetPath);
    user.image = storedFilename;
    await user.save();
    await deleteUser({ id: user.id, token });
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it('deletes hoax attachment from storage(upload folder) and database when delete user request is sent from authorized user', async () => {
    const user = await postUser(user1);
    const { token } = await loginUser(credentials);

    const storedFilename = 'profile-image-user';
    const testFilepath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const targetPath = path.join(attachmentsFolder, storedFilename);
    fs.copyFileSync(testFilepath, targetPath);

    const storedAttachment = await FileAttachment.create({
      filename: storedFilename,
    });

    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hoax content', fileAttachmentId: storedAttachment.id });
    await deleteUser({ id: user.id, token });
    const storedAttachmentAfterUserDelete = await FileAttachment.findOne({
      where: { id: storedAttachment.id },
    });
    expect(fs.existsSync(targetPath)).toBe(false);
    expect(storedAttachmentAfterUserDelete).toBeNull();
  });
});
