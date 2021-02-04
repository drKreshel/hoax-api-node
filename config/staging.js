module.exports = {
  database: {
    database: 'hoaxify',
    username: 'drKreshel',
    password: 'superfluosCat',
    dialect: 'sqlite',
    storage: './staging.sqlite',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: { rejectUnauthorized: false },
  },
  directories: {
    uploadDir: 'upload-staging',
    profileDir: 'profile',
    attachmentsDir: 'attachments',
  },
};

// PostgresSQL database config
/* SQLite database
  database: {
    database: 'hoaxify',
    username: 'postgres',
    password: '1',
    dialect: 'postgres',
    host: 'localhost',
    logging: false,
  },
*/