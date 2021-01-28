const { Hoax, User } = require('../associations');
const NotFoundException = require('../error/NotFoundException');

const save = async (body, userId) => {
  const hoax = {
    content: body.content,
    timestamp: Date.now(),
    userId,
  };
  await Hoax.create(hoax);
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

  const haoxes = await Hoax.findAndCountAll({
    where,
    attributes: ['id', 'content', 'timestamp'],
    include: {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'image'],
    },
    offset: size * page,
    limit: size,
    order: orderArr,
  });
  const content = haoxes.rows;
  const totalPages = Math.ceil(haoxes.count / size);
  return { content, page, size, totalPages };
};

module.exports = { save, getHoaxes };
