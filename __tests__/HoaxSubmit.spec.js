const request = require('supertest');
const path = require('path');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');
const { User, Hoax, FileAttachment } = require('../src/associations');

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

// eslint-disable-next-line prettier/prettier
const postUser = async ({ username = 'user1', email = 'user1@mail.com', password = 'P4ssword', inactive = false, } = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const postHoax = async ({ body = {}, auth = {}, language } = {}) => {
  let token;
  const agent = request(app).post('/api/1.0/hoaxes');

  if (auth.token) token = auth.token;
  else {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send({ email: auth.email || 'user1@mail.com', password: auth.password || 'P4ssword' });
    token = response.body.token;
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (language) {
    agent.set('Accept-Language', language);
  }

  return agent.send(body);
};

const loginUser = async ({ email, password }) => {
  const response = await request(app).post('/api/1.0/auth').send({ email, password });
  return response.body;
};

const deleteUser = async ({ id, token, language } = {}) => {
  const agent = request(app).delete(`/api/1.0/users/${id}`);

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (language) {
    agent.set('Accept-Language', language);
  }

  return agent.send();
};

const uploadFile = (file = 'test-png.png', options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Post Hoax', () => {
  it('returns "401" Bad Request when hoax post request hast no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_hoax_submit}
    ${'de'}  | ${de.unauthorized_hoax_submit}
  `(
    'returns error body with message "$message" when unauthorized request is sent and language is set as "$language"',
    async ({ language, message }) => {
      const now = Date.now();
      const response = await postHoax({ body: { content: 'Un hoax' }, auth: {}, language });
      const error = response.body;
      expect(error.path).toBe('/api/1.0/hoaxes');
      expect(error.timestamp).toBeGreaterThan(now);
      expect(error.message).toBe(message);
    }
  );

  it('returns "200" OK when valid hoax was submitted by authorized user', async () => {
    await postUser();
    const response = await postHoax({
      body: { content: 'my first hoax' },
      auth: credentials,
    });
    expect(response.status).toBe(200);
  });

  it('saves the hoax to database when authorized user sends valid request', async () => {
    await postUser();
    await postHoax({ body: { content: 'another hoax' }, auth: credentials });
    const hoaxes = await Hoax.findAll();
    expect(hoaxes.length).toBe(1);
  });

  it('saves the hoax content and timestamp to database', async () => {
    await postUser();
    const timeBeforeHoaxSubmit = Date.now();
    await postHoax({ body: { content: 'Hoax test content' }, auth: credentials });
    const hoaxes = await Hoax.findAll();
    const savedHoax = hoaxes[0];
    expect(savedHoax.content).toBe('Hoax test content');
    expect(savedHoax.timestamp).toBeGreaterThan(timeBeforeHoaxSubmit);
    expect(savedHoax.timestamp).toBeLessThan(Date.now());
  });

  it.each`
    language | message
    ${'en'}  | ${en.hoax_submit_success}
    ${'de'}  | ${de.hoax_submit_success}
  `(
    'returns "$message" when hoax is succesfully submitted and language is set to "$language"',
    async ({ language, message }) => {
      await postUser();
      const response = await postHoax({ body: { content: 'A hoax content' }, auth: credentials, language });
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'en'}  | ${en.validation_failure}
    ${'de'}  | ${de.validation_failure}
  `(
    'returns "400" Bad Request with message: "$message" when hoax content is less than 10 characters and language is set to $language',
    async ({ language, message }) => {
      await postUser();
      const response = await postHoax({ body: { content: 'shortHoax' }, auth: credentials, language });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns a validation error body when an invalid hoax post is made by authorized user', async () => {
    await postUser();
    const now = Date.now();
    const response = await postHoax({ body: { content: 'shortHoax' }, auth: credentials });
    const error = response.body;
    expect(error.timestamp).toBeGreaterThan(now);
    expect(error.path).toBe('/api/1.0/hoaxes');
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it.each`
    language | content             | contentDescription         | message
    ${'en'}  | ${null}             | ${null}                    | ${en.hoax_content_size}
    ${'en'}  | ${'shortHoax'}      | ${'below 10 characters'}   | ${en.hoax_content_size}
    ${'en'}  | ${'a'.repeat(5001)} | ${'above 5000 characters'} | ${en.hoax_content_size}
    ${'de'}  | ${null}             | ${null}                    | ${de.hoax_content_size}
    ${'de'}  | ${'shortHoax'}      | ${'below 10 characters'}   | ${de.hoax_content_size}
    ${'de'}  | ${'a'.repeat(5001)} | ${'above 5000 characters'} | ${de.hoax_content_size}
  `(
    'returns "$message" when the content is $contentDescription and language is set to $language',
    async ({ language, content, message }) => {
      await postUser();
      const response = await postHoax({ body: { content }, auth: credentials, language });
      expect(response.body.validationErrors.content).toBe(message);
    }
  );

  it('stores hoax owner id in database', async () => {
    const user = await postUser();
    await postHoax({ body: { content: 'Hoax test content' }, auth: credentials });
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];
    expect(hoax.userId).toBe(user.id);
  });

  it("deletes the user's hoaxes from database when delete request is sent from authorized user", async () => {
    const user = await postUser();
    const login = await loginUser(credentials);
    await request(app)
      .post('/api/1.0/hoaxes')
      .set('Authorization', `Bearer ${login.token}`)
      .send({ content: 'new test hoax content' });
    // await Hoax.create({ content: 'Hoax test content', userId: user.id }, { where: { userId: user.id } });
    await deleteUser({ id: user.id, token: login.token });
    const dbHoax = await Hoax.findOne({ where: { userId: user.id } });
    expect(dbHoax).toBeNull();
  });

  it('associates hoax with attachment in database', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;

    await postUser();
    await postHoax({
      body: { content: 'Hoax test content', fileAttachmentId: uploadedFileId },
      auth: credentials,
    });
    const hoaxes = await Hoax.findAll();
    const hoax = hoaxes[0];

    const dbFileAttachment = await FileAttachment.findOne({ where: { id: uploadedFileId } });
    expect(dbFileAttachment.hoaxId).toBe(hoax.id);
  });

  it('returns "200" Ok even if attachment is not in database', async () => {
    await postUser();
    const response = await postHoax({
      body: { content: 'Hoax test content without a file attachment', fileAttachmentId: -5 },
      auth: credentials,
    });
    expect(response.status).toBe(200);
  });

  it('keeps the old associated hoax when new hoax is submitted with the same attachment id', async () => {
    const uploadResponse = await uploadFile();
    const uploadedFileId = uploadResponse.body.id;
    await postUser();

    // first hoax
    await postHoax({
      body: { content: 'First Hoax content', fileAttachmentId: uploadedFileId },
      auth: credentials,
    });
    const attachment = await FileAttachment.findOne({ where: { id: uploadedFileId } });

    // second hoax
    await postHoax({
      body: { content: 'Second Hoax content', fileAttachmentId: uploadedFileId },
      auth: credentials,
    });
    const attachmentAfterSecondHoax = await FileAttachment.findOne({ where: { id: uploadedFileId } });

    expect(attachment.hoaxId).toBe(attachmentAfterSecondHoax.hoaxId);
  });
});
