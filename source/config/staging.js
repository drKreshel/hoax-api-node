module.exports = {
  database: {
    database: 'hoaxify',
    username: 'drKreshel',
    password: 'superfluosCat',
    dialect: 'sqlite',
    storage: './staging.sqlite',
    logging: true,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: { rejectUnauthorized: false },
  },
  directories: {
    uploadDir: 'upload-staging',
    profileDir: 'profile',
  },
};
