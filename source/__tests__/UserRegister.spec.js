const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

beforeAll(() => sequelize.sync());

beforeEach(() => User.destroy({ truncate: true }));

function postUser({ username = 'user1', email = 'user1@mail.com', password = 'P4ssword' } = {}) {
  return request(app).post('/api/1.0/users').send({ username, email, password });
}

describe('User registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success mesage when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
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

  it('returns validationErrors field in response body when validation errors occurs', async () => {
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

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${'Username cannot be null'}
    ${'username'} | ${'usr'}            | ${'Username field must have a minimum 4 and a maximum of 32 characters'}
    ${'username'} | ${'a'.repeat(33)}   | ${'Username field must have a minimum 4 and a maximum of 32 characters'}
    ${'email'}    | ${null}             | ${'E-mail cannot be null'}
    ${'email'}    | ${'mail.com'}       | ${'E-mail is not valid'}
    ${'email'}    | ${'user1@mail'}     | ${'E-mail is not valid'}
    ${'email'}    | ${'user1.mail.com'} | ${'E-mail is not valid'}
    ${'password'} | ${null}             | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}          | ${'Password must have at least 6 characters'}
    ${'password'} | ${'alllowercase'}   | ${'Password must have at least one uppercase, one lowercase letter and one number'}
    ${'password'} | ${'ALLUPPERCASE'}   | ${'Password must have at least one uppercase, one lowercase letter and one number'}
    ${'password'} | ${'123456'}         | ${'Password must have at least one uppercase, one lowercase letter and one number'}
    ${'password'} | ${'lower&UPPER'}    | ${'Password must have at least one uppercase, one lowercase letter and one number'}
    ${'password'} | ${'lower&1234'}     | ${'Password must have at least one uppercase, one lowercase letter and one number'}
    ${'password'} | ${'1234&UPPER'}     | ${'Password must have at least one uppercase, one lowercase letter and one number'}
  `('returns "$expectedMessage" when $field is "$value"', async ({ field, value, expectedMessage }) => {
    const response = await postUser({ [field]: value });
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it('returns "E-mail already in use" when same email is already in the database', async () => {
    await User.create({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe('E-mail already in use');
  });

  it('returns errors for both, username is null and email is in use', async () => {
    await User.create({ username: 'user1', email: 'user1@mail.com', password: 'P4ssword' });
    const response = await postUser({ username: null });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  // it('returns size validation error when username length is lower than 4', async () => {
  //   const response = await postUser({ username: 'use' });
  //   const body = response.body;
  //   expect(body.validationErrors.username).toBe('Username field must have a minimum 4 and a maximum of 32 characters');
  // });
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
