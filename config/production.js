module.exports = {
  database: {
    database: 'hoaxify',
    username: 'drKreshel',
    password: 'superfluosCat',
    dialect: 'sqlite',
    storage: './productionDatabase.sqlite',
    logging: false,
  },
  mail: {
    service: 'gmail',
    auth: {
      user: 'juanloza877@gmail.com',
      pass: '^Uv2C8K1eJ^4',
    },
  },
  directories: {
    uploadDir: 'upload-production',
    profileDir: 'profile',
    attachmentsDir: 'attachments',
  },
};
