module.exports = {
  database: {
    database: 'hoaxify',
    username: 'drKreshel',
    password: 'superfluosCat',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'aurore66@ethereal.email',
      pass: 'HnnrCT8sg6kFwGb5ZM',
    },
  },
  directories: {
    uploadDir: 'upload-dev',
    profileDir: 'profile',
  },
};
