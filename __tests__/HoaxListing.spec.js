const request = require('supertest');
const app = require('../src/app');
const { Hoax, User, FileAttachment } = require('../src/associations');

// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
});

const addFileAttachment = async (hoaxId) => {
  await FileAttachment.create({
    filename: `test-file-for-hoax-${hoaxId}`,
    filetype: 'image/png',
    hoaxId,
  });
};

describe('Listing Hoaxes', () => {
  const getHoaxes = async (options = {}) => {
    const agent = request(app).get('/api/1.0/hoaxes');
    if (options.query) {
      agent.query(options.query);
    }
    return agent;
  };

  const postUserAndHoax = async (amount) => {
    const hoaxIds = [];
    for (let i = 0; i < amount; i += 1) {
      const user = await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`,
      });
      const hoax = await Hoax.create({
        content: `hoax content number ${i + 1}`,
        timestamp: Date.now(),
        userId: user.id,
      });
      hoaxIds.push(hoax.id);
    }
    return hoaxIds;
  };

  it('returns status "200" ok when there are no hoaxes in the dabatase', async () => {
    const response = await getHoaxes();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getHoaxes();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 hoaxes per page', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes();
    expect(response.body.content.length).toBe(10);
  });

  it('each hoax returns "id", "content", "timestamp" and user object containing "id", "username", "email" and "image" fields', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
  });

  it('returns fileAttachment having filename and filetype if hoax has any attachment', async () => {
    const hoaxIds = await postUserAndHoax(1);
    const hoaxId = hoaxIds[0];
    await addFileAttachment(hoaxId);
    const response = await getHoaxes();
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user', 'fileAttachment']);
    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'filetype']);
  });

  it('returns 2 total pages when there are 11 hoaxes', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes();
    expect(response.body.totalPages).toEqual(2);
  });

  it('returns second page of hoaxes and a "page indicator" when page is set as "1"', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes({ query: { page: 1 } }); // can also append "?page=1" to the route instead of using query
    expect(response.body.content[0].content).toEqual('hoax content number 11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set below "0"', async () => {
    const response = await getHoaxes({ query: { page: -5 } });
    expect(response.body.page).toBe(0);
  });

  it('returns five hoaxes and corresponding size indicator when size is set as "5" in request', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes({ query: { size: 5 } });
    expect(response.body.size).toBe(5);
    expect(response.body.content.length).toBe(5);
  });

  it('returns 10 hoaxes as default if size is set below 0', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes({ query: { size: -2 } });
    expect(response.body.size).toBe(10);
  });

  it('returns maximum 10 hoaxes if query size is larger than that', async () => {
    // prevent users to spam huge requests
    await postUserAndHoax(11);
    const response = await getHoaxes({ query: { size: 1000 } });
    expect(response.body.size).toBe(10);
    expect(response.body.content.length).toBe(10);
  });

  it('returns page and size defaults when non numeric parameters are entered', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes({ query: { size: 'very big', page: 'an important page' } });
    expect(response.body.content.length).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes ordered by date when requested in query', async () => {
    await postUserAndHoax(11);
    const response = await getHoaxes({
      query: {
        order: 'timestamp-DESC|id-ASC',
      },
    });
    const firstHoax = response.body.content[0];
    const middleHoax = response.body.content[5];
    const lastHoax = response.body.content[9];
    expect(firstHoax.timestamp).toBeGreaterThan(middleHoax.timestamp);
    expect(middleHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});

describe('Listing Hoaxes of a user', () => {
  const postUser = (username = 'user1', email = 'user1@mail.com') => {
    return User.create({
      username,
      email,
    });
  };

  const getHoaxes = (id) => {
    return request(app).get(`/api/1.0/users/${id}/hoaxes`);
  };

  const postHoaxes = async (amount, userId) => {
    const hoaxIds = [];
    for (let i = 0; i < amount; i += 1) {
      const hoax = await Hoax.create({
        content: `hoax content number ${i + 1}`,
        timestamp: Date.now(),
        userId,
      });
      hoaxIds.push(hoax.id);
    }
    return hoaxIds;
  };

  it('returns "200" Ok when there are no hoaxes in the database', async () => {
    const user = await postUser();
    const response = await getHoaxes(user.id);
    expect(response.status).toBe(200);
  });

  it('returns "404" Not Found when user does not exist', async () => {
    const response = await getHoaxes(5);
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'de'}  | ${de.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `(
    'returns error object with message "$message" for unknown user when language is set to $language',
    async ({ language, message }) => {
      const now = new Date().getTime();
      const response = await getHoaxes(5).set('Accept-Language', language);
      const error = response.body;
      expect(error.message).toBe(message);
      expect(error.path).toBe('/api/1.0/users/5/hoaxes');
      expect(error.timestamp).toBeGreaterThan(now);
    }
  );

  it('returns page object as response body', async () => {
    const user = await postUser();
    const response = await getHoaxes(user.id);
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 hoaxes when there are 11 hoaxes in database', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    expect(response.body.content.length).toBe(10);
  });

  it('returns 5 hoaxes belonging to a single user when there are 11 hoaxes belonging to two users', async () => {
    const user1 = await postUser();
    await postHoaxes(5, user1.id);

    const user2 = await postUser('user2', 'user2@mail.com');
    await postHoaxes(6, user2.id);

    const response = await getHoaxes(user1.id);
    expect(response.body.content.length).toBe(5);
  });

  it('returns only "id", "content", "timestamp" fields and user object containing "id", "username", "email" and "image" fields', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    const userKeys = Object.keys(hoax.user);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user']);
    expect(userKeys).toEqual(['id', 'username', 'email', 'image']);
  });

  it('returns fileAttachment having filename and filetype if hoax has any attachment', async () => {
    const user = await postUser();
    const hoaxIds = await postHoaxes(1, user.id);

    const hoaxId = hoaxIds[0];
    await addFileAttachment(hoaxId);
    const response = await getHoaxes(user.id);
    const hoax = response.body.content[0];
    const hoaxKeys = Object.keys(hoax);
    expect(hoaxKeys).toEqual(['id', 'content', 'timestamp', 'user', 'fileAttachment']);
    const fileAttachmentKeys = Object.keys(hoax.fileAttachment);
    expect(fileAttachmentKeys).toEqual(['filename', 'filetype']);
  });

  it('returns 2 total pages when there are 11 hoaxes', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: 1 });
    expect(response.body.totalPages).toEqual(2);
  });

  it('returns second page and page indicator when page is set as 1', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: 1 });
    expect(response.body.content[0].content).toEqual('hoax content number 11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page query is set as below zero', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ page: -4 });
    expect(response.body.page).toBe(0);
  });

  it('returns five users and corresponding size indicator when size is set as "5" in request', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 5 });
    expect(response.body.size).toBe(5);
    expect(response.body.content.length).toBe(5);
  });

  it('returns 10 users as default if size is set below 0', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: -2 });
    expect(response.body.size).toBe(10);
  });

  it('returns maximum 10 users if size is larger than that', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({ size: 1000 });
    expect(response.body.size).toBe(10);
    expect(response.body.content.length).toBe(10);
  });

  it('returns page and size defaults when non numeric parameters are entered', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({
      size: 'very big',
      page: 'an important page',
    });
    expect(response.body.content.length).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns hoaxes ordered by newest when requested in query', async () => {
    const user = await postUser();
    await postHoaxes(11, user.id);
    const response = await getHoaxes(user.id).query({
      order: 'timestamp-DESC',
    });
    const firstHoax = response.body.content[0];
    const middleHoax = response.body.content[5];
    const lastHoax = response.body.content[9];
    expect(firstHoax.timestamp).toBeGreaterThan(middleHoax.timestamp);
    expect(middleHoax.timestamp).toBeGreaterThan(lastHoax.timestamp);
  });
});
