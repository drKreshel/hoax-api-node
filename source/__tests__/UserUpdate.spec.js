const request = require('supertest');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir } = require('config').directories;
const app = require('../src/app');
const sequelize = require('../src/config/database');
const { User } = require('../src/associations');
// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

const profileImageDir = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

/** Not needed anymore since we have the test-cleanUp.js file */
// afterAll(() => {
//   const files = fs.readdirSync(profileImageDir);
//   for (const file of files) {
//     fs.unlinkSync(path.join(profileImageDir, file));
//   }
// });

const readFileAsBase64 = (file = 'test-png.png') => {
  const filePath = path.join('.', '__tests__', 'resources', file); // this way we don't have problems with different os having different dir separators
  return fs.readFileSync(filePath, 'base64');
};

const postUser = async ({
  username = 'user1',
  email = 'user1@mail.com',
  password = 'P4ssword',
  inactive = false,
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({ username, email, password: hashedPassword, inactive });
};

const putUser = async ({ id = 5, body = {}, auth = {}, language } = {}) => {
  let token;
  const agent = request(app).put(`/api/1.0/users/${id}`);

  // in case we wan't to pass a token ourselves (a wrong one)
  if (auth.token) token = auth.token;
  // in case there is auth but no token is passed, we create a login to retrieve a valid token
  else {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send({ email: auth.email || 'user1@mail.com', password: auth.password || 'P4ssword' });
    token = response.body.token;
  }

  // in case login was succesful or a token object was passed to auth,we assign token to http authorization headers
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
    /** // create Authorization header
      const str = `${email}:${password}`;
      const base64 = Buffer.from(str).toString('base64');
      agent.set('Authorization', `Basic ${base64}`);
    */
    /* // with supertest agent you can also set it like this:
      agent.auth(email, password)
    */
  }
  if (language) {
    agent.set('Accept-Language', language);
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
      const response = await putUser({ language });
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

  // 9
  it('returns "403" forbidden when token is not valid', async () => {
    const response = await putUser({
      id: 5,
      body: { username: 'a-new-name' },
      auth: { token: 'invalid-token' },
    });
    expect(response.status).toBe(403);
  });

  // 10
  it('saves user image when update contains image as base64', async () => {
    const fileInBase64 = readFileAsBase64();
    const user = await postUser();
    await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    const dbUser = await User.findOne({ where: { id: user.id } });
    expect(dbUser.image).toBeTruthy();
  });

  // 11
  it('returns success body only having id, username, email and image', async () => {
    const fileInBase64 = readFileAsBase64();
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email', 'image']);
  });

  it('saves user image to upload folder and stores filename is user when profile image is updated', async () => {
    const fileInBase64 = readFileAsBase64();
    const user = await postUser();
    await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    const dbUser = await User.findOne({ where: { id: user.id } });
    const profileImagePath = path.join(profileImageDir, dbUser.image);
    expect(fs.existsSync(profileImagePath)).toBeTruthy();
  });

  it('removes old image after user uploads a new one', async () => {
    const fileInBase64 = readFileAsBase64();
    const user = await postUser();
    // first image
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    const firstImage = response.body.image;
    const firstImagePath = path.join(profileImageDir, firstImage);
    // second image (backEnd interprets the image as new, even if its the same file (will generate a new random name for it))
    await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });

    // we expect first image to be gone
    expect(fs.existsSync(firstImagePath)).toBe(false);
  });

  /** ********************
   *  ✨   Validations
   ********************* */
  // username validations on update
  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.username_null}
    ${'en'}  | ${'usr'}          | ${en.username_size}
    ${'en'}  | ${'a'.repeat(33)} | ${en.username_size}
    ${'de'}  | ${null}           | ${de.username_null}
    ${'de'}  | ${'usr'}          | ${de.username_size}
    ${'de'}  | ${'a'.repeat(33)} | ${de.username_size}
  `(
    'returns "400" Bad Request with $message when username is updated with $value and language is set as $language',
    async ({ language, value, message }) => {
      const user = await postUser();
      const response = await putUser({
        id: user.id,
        body: { username: value },
        auth: { email: user.email, password: 'P4ssword' },
        language,
      });
      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );

  // File size validation
  it('returns "200" Ok when image is 2mb or lower', async () => {
    // we create a png file with 2mb size by using a png and appending a base64 encoded string to it
    const testPng = readFileAsBase64();
    const pngBytes = Buffer.from(testPng, 'base64').length;
    const filling = 'a'.repeat(1024 * 1024 * 2 - pngBytes);
    const fillInBase64 = Buffer.from(filling).toString('base64');
    const twoMBpngFile = testPng + fillInBase64;
    //---------------------------------------------

    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: twoMBpngFile },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('returns "400" Bad Request when image size exceeds 2mb', async () => {
    // eslint-disable-next-line prefer-template
    const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const fileInBase64 = Buffer.from(fileExceeding2MB).toString('base64');
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(400);
  });

  it('returns "400" Bad Request when image size exceeds 2mb', async () => {
    // eslint-disable-next-line prefer-template
    const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const fileInBase64 = Buffer.from(fileExceeding2MB).toString('base64');
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(400);
  });

  it('keeps old image after user changes only username', async () => {
    const fileInBase64 = readFileAsBase64();
    const user = await postUser();

    // first image
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    const firstImage = response.body.image;
    const firstImagePath = path.join(profileImageDir, firstImage);

    // second image (backEnd interprets the image as new, even if its the same file (will generate a new random name for it))
    // not passing image in the body
    await putUser({
      id: user.id,
      body: { username: 'a-new-name-updatedAgain' },
      auth: { email: user.email, password: 'P4ssword' },
    });

    // we expect first image to still be there
    expect(fs.existsSync(firstImagePath)).toBe(true);

    const dbUser = await User.findOne({ where: { id: user.id } });
    expect(dbUser.image).toBe(firstImage);
  });

  it.each`
    language | message
    ${'en'}  | ${en.image_size_limit_exceeded}
    ${'de'}  | ${de.image_size_limit_exceeded}
  `(
    'returs $message when file size exceeds 2mb when language is $language',
    async ({ language, message }) => {
      // eslint-disable-next-line prefer-template
      const fileExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
      const fileInBase64 = Buffer.from(fileExceeding2MB).toString('base64');
      const user = await postUser();
      const response = await putUser({
        id: user.id,
        body: { username: 'a-new-name', image: fileInBase64 },
        auth: { email: user.email, password: 'P4ssword' },
        language,
      });
      expect(response.body.validationErrors.image).toBe(message);
    }
  );

  it.each`
    file              | status
    ${'test-gif.gif'} | ${400}
    ${'test-pdf.pdf'} | ${400}
    ${'test-txt.txt'} | ${400}
    ${'test-png.png'} | ${200}
    ${'test-jpg.jpg'} | ${200}
  `('returns $status when uploading $file as image', async ({ file, status }) => {
    const fileInBase64 = readFileAsBase64(file);
    const user = await postUser();
    const response = await putUser({
      id: user.id,
      body: { username: 'a-new-name', image: fileInBase64 },
      auth: { email: user.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(status);
  });

  it.each`
    file              | language | message
    ${'test-gif.gif'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-txt.txt'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-gif.gif'} | ${'de'}  | ${de.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'de'}  | ${de.unsupported_image_file}
    ${'test-txt.txt'} | ${'de'}  | ${de.unsupported_image_file}
  `(
    'returns "$message" when uploading $file as image and language is set to $language',
    async ({ file, language, message }) => {
      const fileInBase64 = readFileAsBase64(file);
      const user = await postUser();
      const response = await putUser({
        id: user.id,
        body: { username: 'a-new-name', image: fileInBase64 },
        auth: { email: user.email, password: 'P4ssword' },
        language,
      });
      expect(response.body.validationErrors.image).toBe(message);
    }
  );
});
