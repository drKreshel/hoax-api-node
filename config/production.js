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
      user: 'anEmail@gmail.com',
      pass: '^2212C42eJ^4',
    },
  },
  directories: {
    uploadDir: 'upload-production',
    profileDir: 'profile',
    attachmentsDir: 'attachments',
  },
};
