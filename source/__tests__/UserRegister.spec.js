const request = require('supertest');
// const nodemailerStub = require('nodemailer-stub'); being replaced by SMTP server
const { SMTPServer } = require('smtp-server'); // stands for Simple Mail Transfer Protocol

const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');
// const EmailService = require('../src/email/EmailService'); // not needed with SMTP server

// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

let lastMail, server, simulateSMTPFailure;

beforeAll(async () => {
  // server initialize
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSMTPFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  server.listen(8587, 'localhost');
  await sequelize.sync();

  // assures that SMTP server is up before tests
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSMTPFailure = false;
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const postUser = (
  { username = 'user1', email = 'user1@mail.com', password = 'P4ssword', ...otherParams } = {},
  language = 'en'
) =>
  request(app)
    .post('/api/1.0/users')
    .set('Accept-Language', language)
    .send({ username, email, password, ...otherParams });

describe('User registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it(`returns success mesage when signup request is valid`, async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves the user in the database', async () => {
    await postUser();
    const usersList = await User.findAll();
    expect(usersList.length).toBe(1);
  });

  it('saves the username and email in the database', async () => {
    await postUser();
    const user = await User.findAll(); // TODO: cambiar a findOne?
    expect(user[0].username).toBe('user1');
    expect(user[0].email).toBe('user1@mail.com');
  });

  it('hashes the password when before saving in the database', async () => {
    await postUser();
    const user = await User.findAll(); // TODO: cambiar a findOne?
    expect(user[0].password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({ username: null });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occurs in register form', async () => {
    const response = await postUser({ username: null });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  /* These 3 are replaced with it.each below
  it('returns "username cannot be null" validation error when username is null', async () => {
    const response = await postUser({ username: null });
    const body = response.body;
    expect(body.validationErrors.username).toBe('Username cannot be null');
  });
  
  it('returns "E-mail cannot be null" validation error when email is null', async () => {
    const response = await postUser({ email: null });
    const body = response.body;
    expect(body.validationErrors.email).toBe('E-mail cannot be null');
  });
  
  it('returns "Password cannot be null" validation error when password is null', async () => {
    const response = await postUser({ password: null });
    const body = response.body;
    expect(body.validationErrors.password).toBe('Password cannot be null');
  });
*/
  // plain js
  // [
  //   { field: 'username', value: null, expectedMessage: 'Username cannot be null' },
  //   {
  //     field: 'username',
  //     value: 'usr',
  //     expectedMessage: 'Username field must have a minimum 4 and a maximum of 32 characters',
  //   },
  //   { field: 'password', value: null, expectedMessage: 'Password cannot be null' },
  //   { field: 'email', value: null, expectedMessage: 'E-mail cannot be null' },
  // ].forEach(({ field, value, expectedMessage }) => {
  //   it(`returns ${expectedMessage} when ${field} is ${value}`, async () => {
  //     const response = await postUser({ [field]: value });
  //     const body = response.body;
  //     expect(body.validationErrors[field]).toBe(expectedMessage);
  //   });
  // });

  // using jest method:
  // test.each([
  //   ['username', 'Username cannot be null'],
  //   ['password', 'Password cannot be null'],
  //   ['email', 'E-mail cannot be null'],
  // ])('when %s is null, %s is received', async (field, expectedMessage) => {
  //   const response = await postUser({ [field]: null });
  //   const body = response.body;
  //   expect(body.validationErrors[field]).toBe(expectedMessage);
  // });
  // using table jest method

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${en.username_null}
    ${'username'} | ${'usr'}            | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}   | ${en.username_size}
    ${'email'}    | ${null}             | ${en.email_null}
    ${'email'}    | ${'mail.com'}       | ${en.email_invalid}
    ${'email'}    | ${'user1@mail'}     | ${en.email_invalid}
    ${'email'}    | ${'user1.mail.com'} | ${en.email_invalid}
    ${'password'} | ${null}             | ${en.password_null}
    ${'password'} | ${'P4ssw'}          | ${en.password_size}
    ${'password'} | ${'alllowercase'}   | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}   | ${en.password_pattern}
    ${'password'} | ${'123456'}         | ${en.password_pattern}
    ${'password'} | ${'lower&UPPER'}    | ${en.password_pattern}
    ${'password'} | ${'lower&1234'}     | ${en.password_pattern}
    ${'password'} | ${'1234&UPPER'}     | ${en.password_pattern}
  `('returns "$expectedMessage" when $field is "$value"', async ({ field, value, expectedMessage }) => {
    const response = await postUser({ [field]: value });
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns "${en.email_in_use}" when same email is already in the database`, async () => {
    await User.create({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe(en.email_in_use);
  });

  it('returns errors for both, username is null and email is in use', async () => {
    await User.create({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    const response = await postUser({ username: null });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it(`creates user in inactive mode`, async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it(`creates user in inactive mode even if the request is sent as "active"`, async () => {
    await postUser({ inactive: false });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it(`creates an activation token`, async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an activation account email with an activation token', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    // const failMailMock = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSMTPFailure = true; // with the STMP Server we don't need to use the jest mock implementation
    const response = await postUser();
    // failMailMock.mockRestore(); // this clears the mock (or else it continues failing on following tests)
    expect(response.status).toBe(502);
  });

  it('returns "Email failure" message when sending email fails', async () => {
    simulateSMTPFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  // if mail fails, we should not add the user to the database
  it('does not save user to database if activation email fails', async () => {
    simulateSMTPFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('returns "Validation failure" error message when validation errors occurs', async () => {
    const response = await postUser({ username: null });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internalization', () => {
  it(`returns "${de.user_create_success}" when signup request is valid and language is set to german`, async () => {
    const response = await postUser({}, 'de');
    expect(response.body.message).toBe(de.user_create_success);
  });

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${de.username_null}
    ${'username'} | ${'usr'}            | ${de.username_size}
    ${'username'} | ${'a'.repeat(33)}   | ${de.username_size}
    ${'email'}    | ${null}             | ${de.email_null}
    ${'email'}    | ${'mail.com'}       | ${de.email_invalid}
    ${'email'}    | ${'user1@mail'}     | ${de.email_invalid}
    ${'email'}    | ${'user1.mail.com'} | ${de.email_invalid}
    ${'password'} | ${null}             | ${de.password_null}
    ${'password'} | ${'P4ssw'}          | ${de.password_size}
    ${'password'} | ${'alllowercase'}   | ${de.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}   | ${de.password_pattern}
    ${'password'} | ${'123456'}         | ${de.password_pattern}
    ${'password'} | ${'lower&UPPER'}    | ${de.password_pattern}
    ${'password'} | ${'lower&1234'}     | ${de.password_pattern}
    ${'password'} | ${'1234&UPPER'}     | ${de.password_pattern}
  `(
    'returns "$expectedMessage" when $field is "$value" when language is set as german',
    async ({ field, value, expectedMessage }) => {
      const response = await postUser({ [field]: value }, 'de');
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns "${de.email_in_use}" when same email is already in the database and language is set as german`, async () => {
    await User.create({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    const response = await postUser({}, 'de');
    const body = response.body;
    expect(body.validationErrors.email).toBe(de.email_in_use);
  });

  it(`returns "${de.email_failure}" message when sending email fails and language is set to german`, async () => {
    simulateSMTPFailure = true;
    const response = await postUser({}, 'de');
    expect(response.body.message).toBe(de.email_failure);
  });

  it(`returns "${de.validation_failure}" error message when validation errors occurs and language is set to german`, async () => {
    const response = await postUser({ username: null }, 'de');
    expect(response.body.message).toBe(de.validation_failure);
  });
});

describe('User activation', () => {
  it('activates account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`); // ? Shouldn't be http PATCH?
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after succesful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`); // ? Shouldn't be http PATCH?
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it("does not activate the user's account when token is incorrect", async () => {
    await postUser();
    let users = await User.findAll();
    const token = 'this-is-an-invalid-token';

    await request(app).post(`/api/1.0/users/token/${token}`);
    users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns 400 "Bad Request" when token is incorrect', async () => {
    await postUser();
    const token = 'this-is-an-invalid-token';
    const response = await request(app).post(`/api/1.0/users/token/${token}`);
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'de'}  | ${'invalid'} | ${de.account_activation_failure}
    ${'en'}  | ${'invalid'} | ${en.account_activation_failure}
    ${'de'}  | ${'valid'}   | ${de.account_activation_success}
    ${'en'}  | ${'valid'}   | ${en.account_activation_success}
  `(
    'returns "$message" when token is $tokenStatus and language is set to $langauge',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-is-an-invalid-token';
      if (tokenStatus === 'valid') {
        const users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post(`/api/1.0/users/token/${token}`)
        .set({ 'Accept-Language': language });
      expect(response.body.message).toBe(message);
    }
  );
});

describe('', () => {
  it('returns path, timestamp, message and validationErrors on the response body when a validation error occurs', async () => {
    const response = await postUser({ username: null });
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp and message on the response body when an error other than "Validation Error" ocurrs', async () => {
    const token = 'this-is-an-invalid-token';
    const response = await request(app).post(`/api/1.0/users/token/${token}`).send(); // el send no parece tener ninguna influencia en los tests
    expect(Object.keys(response.body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path on the error response body', async () => {
    const token = 'this-is-an-invalid-token';
    const response = await request(app).post(`/api/1.0/users/token/${token}`);
    expect(response.body.path).toEqual(`/api/1.0/users/token/${token}`);
  });

  it('returns timestamp in milliseconds on the error response body', async () => {
    const now = new Date().getTime();
    const fiveSecondsFromNow = now + 5000;
    const token = 'this-is-an-invalid-token';
    const response = await request(app).post(`/api/1.0/users/token/${token}`);
    expect(response.body.timestamp).toBeGreaterThan(now);
    expect(response.body.timestamp).toBeLessThan(fiveSecondsFromNow);
  });
});

/**
   * Formas alternativas del primer test
  it('returns 200 OK when signup request is valid', async (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({ username: ' user1', email: 'user1@mail.com', password: 'P4ssword' })
      .expect(200, done);
    // .done(); // también posible así
  });
   // otra forma usando el expect de (jest) (el de arriba es el expect de supertest)
   it('it returns 200 OK when signup request is valid', async () => {
    const data = await request(app)
      .post('/api/1.0/users')
      .send({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    // .expect(200); //también posible así. Metodo de supertest
    expect(data.status).toEqual(200);  //==>metodo de jest
  });
  
  */
