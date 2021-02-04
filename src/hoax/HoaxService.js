const { Hoax, User, FileAttachment } = require('../associations');
const ForbiddenException = require('../error/ForbiddenException');
const NotFoundException = require('../error/NotFoundException');
const FileService = require('../file/FileService');

const save = async (body, userId) => {
  const hoax = {
    content: body.content,
    timestamp: Date.now(),
    userId,
  };
  const { id } = await Hoax.create(hoax);
  if (body.fileAttachmentId) {
    await FileService.associateFileToHoax(body.fileAttachmentId, id);
  }
};

const getHoaxes = async ({ page, size, query, userId }) => {
  let where = {};
  if (userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    where = { userId };
  }

  const orderArr = [];
  if (query) {
    if (query.order) {
      const orderFields = query.order.split('|');
      orderFields.forEach((e) => {
        const split = e.split('-');
        orderArr.push(split);
      });
      // 'timestamp-DESC|id-ASC' ===> [['timestamp', 'DESC'], ['id','ASC']] (format required in db)
    }
  }

  const hoaxes = await Hoax.findAndCountAll({
    where,
    attributes: ['id', 'content', 'timestamp'],
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email', 'image'] },
      { model: FileAttachment, as: 'fileAttachment', attributes: ['filename', 'filetype'] },
    ],
    offset: size * page,
    limit: size,
    order: orderArr,
  });

  // const content = haoxes.rows;
  // remove null fields (not a good practice, made for ed purposes)
  const noNullFieldsContent = hoaxes.rows.map((hoaxSequelize) => {
    const hoaxAsJSON = hoaxSequelize.get({ plain: true });
    if (hoaxAsJSON.fileAttachment === null) {
      delete hoaxAsJSON.fileAttachment;
    }
    return hoaxAsJSON;
  });

  const totalPages = Math.ceil(hoaxes.count / size);
  return { content: noNullFieldsContent, page, size, totalPages };
};

const deleteHoax = async (hoaxId, userId) => {
  const hoaxToBeDeleted = await Hoax.findOne({
    where: { id: hoaxId, userId },
    include: { model: FileAttachment },
  });
  if (!hoaxToBeDeleted) {
    throw new ForbiddenException('unauthorized_hoax_delete');
  }
  const hoaxJSON = hoaxToBeDeleted.get({ plain: true });

  // deleting file in attachments folder
  if (hoaxJSON.fileAttachment !== null) {
    await FileService.deleteAttachment(hoaxJSON.fileAttachment.filename);
  }
  // removing attachment field in database
  await hoaxToBeDeleted.destroy();
};

module.exports = { save, getHoaxes, deleteHoax };
