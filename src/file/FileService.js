const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { uploadDir, profileDir, attachmentsDir } = require('config').directories;
const FileType = require('file-type');
const { randomString } = require('../shared/generator');
const { FileAttachment, Hoax } = require('../associations');

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentsFolder = path.join('.', uploadDir, attachmentsDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // this doesnt need to be async fs functions because we only use it once at the beginning of our application. (They are nto degrading the speed of our app)
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
  if (!fs.existsSync(attachmentsFolder)) {
    fs.mkdirSync(attachmentsFolder);
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

/** *********************************
 * 🎏 saveAttachment
 *********************************** */
const saveAttachment = async (file) => {
  // We get the type with FileType module. Mimetype of multer only checks extension name to check type. (Changing an image extension confuses it, thats why we use FileType module)
  // .txt is not supported by FileType
  const type = await FileType.fromBuffer(file.buffer);
  let filetype;
  let filename = randomString(32);

  if (type) {
    filetype = type.mime;
    filename += `.${type.ext}`;
  }
  await fs.promises.writeFile(path.join('.', attachmentsFolder, filename), file.buffer);
  const savedAttachment = await FileAttachment.create({
    filename,
    uploadDate: new Date(),
    filetype,
  });

  return {
    id: savedAttachment.id,
  };
};

/** *********************************
 * 🎏 associateFileToHoax
 *********************************** */
const associateFileToHoax = async (attachmentId, hoaxId) => {
  const attachment = await FileAttachment.findOne({ where: { id: attachmentId } });
  if (attachment) {
    if (!attachment.hoaxId) {
      attachment.hoaxId = hoaxId;
      await attachment.save();
    }
  }
  return undefined;
};

/** *********************************
 * 🎏 removeUnusedAttachments
 *********************************** */
const removeUnusedAttachments = () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    const oneDayAgo = new Date(Date.now() - ONE_DAY);
    const attachments = await FileAttachment.findAll({
      where: {
        uploadDate: {
          [Op.lt]: oneDayAgo,
        },
        hoaxId: {
          [Op.is]: null,
        },
      },
    });

    for (const attachment of attachments) {
      const { filename } = attachment.get({ plain: true });
      fs.promises.unlink(path.join(attachmentsFolder, filename));
      await attachment.destroy();
    }
  }, ONE_DAY);
};

/** *********************************
 * 🎏 deleteAttachment
 *********************************** */
const deleteAttachment = async (filename) => {
  const filepath = path.join(attachmentsFolder, filename);
  try {
    await fs.promises.access(filepath);
    await fs.promises.unlink(filepath);
  } catch (error) {
    /**/
  }
};

const deleteUserFiles = async (user) => {
  if (user.image) {
    await deleteProfileImage(user.image);
  }
  const attachments = await FileAttachment.findAll({
    attributes: ['filename'],
    include: {
      model: Hoax,
      where: {
        userId: user.id,
      },
    },
  });
  if (attachments) {
    for (const attachment of attachments) {
      await deleteAttachment(attachment.getDataValue('filename'));
    }
  }
};
module.exports = {
  createFolders,
  saveProfileImage,
  deleteProfileImage,
  isBiggerThan2MB,
  isSupportedFileType,
  saveAttachment,
  associateFileToHoax,
  removeUnusedAttachments,
  deleteAttachment,
  deleteUserFiles,
};
