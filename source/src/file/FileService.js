const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir } = require('config').directories;
const FileType = require('file-type');
const { randomString } = require('../shared/generator');

const profileFolder = path.join('.', uploadDir, profileDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // this doesnt need to be async fs functions because we only use it once at the beginning of our application. (They are nto degrading the speed of our app)
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};
/** *********************************
 * 🎏 Saveprofile
 *********************************** */
// fs.promises (node) version
const saveProfileImage = async (base64file) => {
  const filename = randomString(32);
  const filepath = path.join(profileFolder, filename);
  await fs.promises.writeFile(filepath, base64file, 'base64');
  return filename;
};
// eslint-disable-next-line no-unused-vars
const saveProfileImagePromiseVersion = (base64file) => {
  const filename = randomString(32);
  const filepath = path.join(profileFolder, filename);
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, base64file, 'base64', (error) => {
      if (!error) {
        resolve(filename);
      } else {
        reject(error);
      }
    });
  });
};
// version using async instead of promises
// eslint-disable-next-line no-unused-vars
const saveProfileImageAsyncVersion = async (base64file) => {
  const filename = randomString(32);
  const filepath = path.join(profileFolder, filename);
  let returnValue;
  await fs.writeFile(filepath, base64file, 'base64', (err) => {
    if (!err) returnValue = filename;
    else returnValue = err;
  });
  return returnValue;
};

const deleteProfileImage = async (filename) => {
  const filepath = path.join(profileFolder, filename);
  await fs.promises.unlink(filepath);
};

/** *********************************
 * 🎏 isBiggerThan2MB
 *********************************** */
const isBiggerThan2MB = (buffer) => {
  return buffer.length > 2 * 1024 * 1024;
};

/** *********************************
 * 🎏 isSupportedFileType
 *********************************** */
const isSupportedFileType = async (buffer) => {
  const type = await FileType.fromBuffer(buffer);
  return !!type && !(type.mime !== 'image/png' && type.mime !== 'image/jpeg');
};

module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  isBiggerThan2MB,
  isSupportedFileType,
};
