const request = require('supertest');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { uploadDir, attachmentsDir } = require('config').directories;
const app = require('../src/app');
const { User, Hoax, FileAttachment } = require('../src/associations');
// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

const attachmentsFolder = path.join('.', uploadDir, attachmentsDir);
const filename = `test-file-hoax-delete${Date.now()}`;
const targetPath = path.join(attachmentsFolder, filename);
const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
});

const user1 = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };
const user2 = { username: 'user2', email: 'user2@mail.com', password: 'P4ssword', inactive: false };

const postUser = async ({ username, email, password, inactive } = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const loginUser = async ({ email, password }) => {
  const response = await request(app).post('/api/1.0/auth').send({ email, password });
  return response.body;
};

const postHoax = async (userId) => {
  return Hoax.create({
    content: 'A beautiful new hoax',
    timestamp: Date.now(),
    userId,
  });
};

const deleteHoax = async ({ id, token, language } = {}) => {
  const agent = request(app).delete(`/api/1.0/hoaxes/${id}`);

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (language) {
    agent.set('Accept-Language', language);
  }
  return agent.send();
};

const addFileAttachment = async (hoaxId) => {
  fs.copyFileSync(testFilePath, targetPath);
  return FileAttachment.create({ filename, uploadDate: new Date(), hoaxId });
};

describe('Delete Hoax', () => {
  it('returns "403" Forbidden when request is unauthorized', async () => {
    const response = await deleteHoax({ id: 5 });
    expect(response.status).toBe(403);
  });

  it('returns "403" forbidden when token is not valid', async () => {
    const response = await deleteHoax({ id: 5, token: '123' });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_delete}
    ${'de'}  | ${de.unauthorized_hoax_delete}
  `(
    'returns error body with message:"$message" for unauthorized request and language is set to $language',
    async ({ language, message }) => {
      const now = Date.now();
      const response = await deleteHoax({ id: 5, language });
      expect(response.body.message).toBe(message);
      expect(response.body.timestamp).toBeGreaterThan(now);
      expect(response.body.path).toBe('/api/1.0/hoaxes/5');
    }
  );

  it(`returns "403" Forbidden when an user tries to delete another user's hoax`, async () => {
    // user1 tries to delete hoax from user2
    const user = await postUser(user1);
    const tokenUser1 = await loginUser(credentials);

    await postUser(user2);
    const { id: hoaxUser2 } = await postHoax(user.id);

    const response = await deleteHoax({ id: hoaxUser2, token: tokenUser1 });
    expect(response.status).toBe(403);
  });

  it('returns "200" Ok when user deletes their hoax', async () => {
    const user = await postUser(user1);
    const hoax = await postHoax(user.id);
    const { token } = await loginUser(credentials);

    const response = await deleteHoax({ id: hoax.id, token });
    expect(response.status).toBe(200);
  });

  it('deletes hoax from database when user deletes their hoax', async () => {
    const user = await postUser(user1);
    const hoax = await postHoax(user.id);
    const { token } = await loginUser(credentials);
    await deleteHoax({ id: hoax.id, token });
    const dbHoax = await Hoax.findOne({ where: { id: hoax.id } });
    expect(dbHoax).toBeNull();
  });

  it('removes the file attachment from database when user deletes their hoax', async () => {
    const user = await postUser(user1);
    const hoax = await postHoax(user.id);
    const attachment = await addFileAttachment(hoax.id);
    const { token } = await loginUser(credentials);
    await deleteHoax({ id: hoax.id, token });
    await Hoax.findOne({ where: { id: hoax.id } });
    const dbAttachment = await FileAttachment.findOne({ where: { id: attachment.id } });
    expect(dbAttachment).toBeNull();
  });

  it('removes the file attachment from database when user deletes their hoax', async () => {
    const user = await postUser(user1);
    const hoax = await postHoax(user.id);
    await addFileAttachment(hoax.id);
    const { token } = await loginUser(credentials);
    await deleteHoax({ id: hoax.id, token });
    expect(fs.existsSync(targetPath)).toBe(false);
  });
});
