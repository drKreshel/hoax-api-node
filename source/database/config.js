const enviroments = require('../config');

const databaseConfig = {};

for (const [key, value] of Object.entries(enviroments)) {
  databaseConfig[key] = { ...value.database };
}

module.exports = databaseConfig;

// module.exports = {
//   development: {
//     username: 'drKreshel',
//     password: 'superfluosCat',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './database.sqlite',
//     logging: false,
//   },
//   staging: {
//     username: 'drKreshel',
//     password: 'superfluosCat',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './staging.sqlite',
//     logging: true,
//   },
// };
