const request = require('supertest');
const bcrypt = require('bcrypt');
const { SMTPServer } = require('smtp-server'); // stands for Simple Mail Transfer Protocol
const config = require('config');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const { User, Token } = require('../src/associations');

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

  server.listen(config.mail.port, 'localhost');
  await sequelize.sync();

  // assures that SMTP server is up before tests
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSMTPFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
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

const postPasswordReset = ({ email = 'user1@mail.com', language } = {}) => {
  const agent = request(app).post('/api/1.0/user/password');
  if (language) {
    agent.set('Accept-Language', language);
  }
  return agent.send({ email });
};

const putPassword = (body, language) => {
  const agent = request(app).put('/api/1.0/user/password');
  if (language) {
    agent.set('Accept-Language', language);
  }
  return agent.send(body);
};

describe('Password reset', () => {
  it('returns 404 when a password reset is sent for unknown email', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'en'}  | ${en.email_not_found}
    ${'de'}  | ${de.email_not_found}
  `(
    'returns error body with message:"$message" for unknown email for password reset',
    async ({ language, message }) => {
      const now = new Date().getTime();
      const response = await postPasswordReset({ language });
      expect(response.body.message).toBe(message);
      expect(response.body.timestamp).toBeGreaterThan(now);
      expect(response.body.path).toBe('/api/1.0/user/password');
    }
  );

  it.each`
    language | message
    ${'en'}  | ${en.email_invalid}
    ${'de'}  | ${de.email_invalid}
  `(
    'returns "400" when email is not valid, with message "$message" when language is set to $language',
    async ({ language, message }) => {
      const response = await postPasswordReset({ email: 'invalidMail', language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns "200" ok when password reset is sent from known email', async () => {
    const user = await postUser();
    const response = await postPasswordReset({ email: user.email });
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'en'}  | ${en.password_reset_success}
    ${'de'}  | ${de.password_reset_success}
  `(
    'returns success response body with message $message when language is set as $language',
    async ({ language, message }) => {
      const user = await postUser();
      const response = await postPasswordReset({ email: user.email, language });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates password token when password reset request is sent successfully', async () => {
    const user = await postUser();
    await postPasswordReset({ email: user.email });
    const dbUser = await User.findOne({ where: { id: user.id } });
    expect(dbUser.passwordResetToken).toBeTruthy();
  });

  it('sends a password email with reset token', async () => {
    const user = await postUser();
    await postPasswordReset({ email: user.email });
    const dbUser = await User.findOne({ where: { id: user.id } });
    const passwordResetToken = dbUser.passwordResetToken;
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('returns "502" Bad Gateway when reset password email fails', async () => {
    simulateSMTPFailure = true;
    const user = await postUser();
    const response = await postPasswordReset({ email: user.email });
    expect(response.status).toBe(502);
  });

  it.each`
    language | message
    ${'en'}  | ${en.email_failure}
    ${'de'}  | ${de.email_failure}
  `(
    'returns "$message" message when sending email fails and language is set to $language',
    async ({ language, message }) => {
      simulateSMTPFailure = true;
      const user = await postUser();
      const response = await postPasswordReset({ email: user.email, language });
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Password Update', () => {
  it('returns "403" forbidden when password reset request does not have a valid reset token', async () => {
    const response = await putPassword({
      password: 'New-P4ssword',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'en'}  | ${en.unauthorized_password_reset}
    ${'de'}  | ${de.unauthorized_password_reset}
  `(
    'returns error body with message: "$message" after trying to update password with invalid token when language is set to $language',
    async ({ language, message }) => {
      const now = new Date().getTime();
      const response = await putPassword({ password: 'P4ssword', passwordResetToken: 'abcd' }, language);
      expect(response.body.message).toBe(message);
      expect(response.body.timestamp).toBeGreaterThan(now);
      expect(response.body.path).toBe('/api/1.0/user/password');
    }
  );

  it('returns "403" forbidden when new password pattern and reset token are invalid', async () => {
    const response = await putPassword({
      password: 'pass', // doesn't contain uppercase or any number
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it('returns "400" Bad Request when trying to update password with invalid password', async () => {
    const user = await postUser();
    user.passwordResetToken = 'reset-token';
    await user.save();

    const response = await putPassword({
      password: 'pass', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });
    expect(response.status).toBe(400);
  });

  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.password_null}
    ${'en'}  | ${'P4ssw'}        | ${en.password_size}
    ${'en'}  | ${'alllowercase'} | ${en.password_pattern}
    ${'en'}  | ${'ALLUPPERCASE'} | ${en.password_pattern}
    ${'en'}  | ${'123456'}       | ${en.password_pattern}
    ${'en'}  | ${'lower&UPPER'}  | ${en.password_pattern}
    ${'en'}  | ${'lower&1234'}   | ${en.password_pattern}
    ${'en'}  | ${'1234&UPPER'}   | ${en.password_pattern}
    ${'de'}  | ${null}           | ${de.password_null}
    ${'de'}  | ${'P4ssw'}        | ${de.password_size}
    ${'de'}  | ${'alllowercase'} | ${de.password_pattern}
    ${'de'}  | ${'ALLUPPERCASE'} | ${de.password_pattern}
    ${'de'}  | ${'123456'}       | ${de.password_pattern}
    ${'de'}  | ${'lower&UPPER'}  | ${de.password_pattern}
    ${'de'}  | ${'lower&1234'}   | ${de.password_pattern}
    ${'de'}  | ${'1234&UPPER'}   | ${de.password_pattern}
  `(
    'returns "$message" when password is "$value" and language is set as $language',
    async ({ language, value, message }) => {
      const user = await postUser();
      user.passwordResetToken = 'reset-token';
      await user.save();

      const response = await putPassword(
        {
          password: value, // doesn't contain uppercase or any number
          passwordResetToken: 'reset-token',
        },
        language
      );
      expect(response.body.validationErrors.password).toBe(message);
    }
  );

  it('returns "200" Ok when valid password is sent with valid token', async () => {
    const user = await postUser();
    user.passwordResetToken = 'reset-token';
    await user.save();

    const response = await putPassword({
      password: 'new-P4swword', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });
    expect(response.status).toBe(200);
  });

  it('updates the password in database when request is succesful', async () => {
    const user = await postUser();
    const oldPassword = user.password;
    user.passwordResetToken = 'reset-token';
    await user.save();

    await putPassword({
      password: 'new-P4swword', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });

    const dbUser = await User.findOne({ where: { email: 'user1@mail.com' } });

    expect(dbUser.password).not.toEqual(oldPassword);
  });

  it('clears the reset token once it has been used', async () => {
    // user
    const user = await postUser();
    user.passwordResetToken = 'reset-token';
    await user.save();
    // password update request
    await putPassword({
      password: 'new-P4swword', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });

    const dbUser = await User.findOne({ where: { email: 'user1@mail.com' } });
    expect(dbUser.passwordResetToken).toBe(null);
  });

  it('activates and clears activation token if the account is inactive after valid password reset', async () => {
    // user
    const user = await postUser();
    user.passwordResetToken = 'reset-token';
    user.activationToken = 'activation-token';
    user.inactive = true;
    await user.save();
    // password update request
    await putPassword({
      password: 'new-P4swword', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });

    const dbUser = await User.findOne({ where: { email: 'user1@mail.com' } });
    expect(dbUser.inactive).toBe(false);
    expect(dbUser.activationToken).toBe(null);
  });

  it('clears all session tokens of user after valid password reset', async () => {
    // user
    const user = await postUser();
    user.passwordResetToken = 'reset-token';
    await user.save();
    await Token.create({
      token: 'token1',
      userId: user.id,
      lastUsedAt: Date.now(),
    });
    // password update request
    await putPassword({
      password: 'new-P4swword', // doesn't contain uppercase or any number
      passwordResetToken: 'reset-token',
    });

    const dbTokens = await Token.findAll({ where: { userId: user.id } });
    expect(dbTokens.length).toBe(0);
  });
});
