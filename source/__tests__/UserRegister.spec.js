const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

beforeAll(() => sequelize.sync());

beforeEach(() => User.destroy({ truncate: true }));

function postUser(username = 'user1', email = 'user1@mail.com', password = 'P4ssword') {
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
    const response = await postUser(null);
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occurs', async () => {
    const response = await postUser(null);
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns username cannot be null validation error when username is null', async () => {
    const response = await postUser(null);
    const body = response.body;
    expect(body.validationErrors.username).toBe('Username cannot be null');
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
