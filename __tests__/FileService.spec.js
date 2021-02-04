const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir, attachmentsDir } = require('config').directories;
const FileService = require('../src/file/FileService');
const { User, Hoax, FileAttachment } = require('../src/associations');

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentsFolder = path.join('.', uploadDir, attachmentsDir);

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();
    const folderName = uploadDir;
    expect(fs.existsSync(folderName)).toBe(true);
  });

  it('creates profile folder inside upload folder', () => {
    FileService.createFolders();
    expect(fs.existsSync(profileFolder)).toBe(true);
  });

  it('creates attachments folder inside upload folder', () => {
    FileService.createFolders();
    expect(fs.existsSync(attachmentsFolder)).toBe(true);
  });
});

describe('Scheduled unused attachment file removal', () => {
  const filename = `test-file${Date.now()}`;
  const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');
  const targetPath = path.join(attachmentsFolder, filename);

  beforeEach(async () => {
    await FileAttachment.destroy({ truncate: true });
    await User.destroy({ truncate: { cascade: true } });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  });

  const postUserAndHoax = async () => {
    const user = await User.create({
      username: `user1`,
      email: `user@mail.com`,
    });
    const hoax = await Hoax.create({
      content: `hoax content for test`,
      timestamp: Date.now(),
      userId: user.id,
    });
    return hoax.id;
  };

  it('removes files if not used in a hoax within 24 hours', async (done) => {
    jest.useFakeTimers();

    fs.copyFileSync(testFilePath, targetPath);
    const uploadDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // file without associated Hoax
    const attachment = await FileAttachment.create({ filename, uploadDate });

    FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);

    // setTimeout to allow the attachment cleanup service task to complete
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemoval = await FileAttachment.findOne({ where: { id: attachment.id } });
      expect(attachmentAfterRemoval).toBeNull();
      expect(fs.existsSync(targetPath)).toBe(false);
      done();
    }, 500);
  });

  it('keeps unassociated attachments with less than 24hs', async (done) => {
    jest.useFakeTimers();

    fs.copyFileSync(testFilePath, targetPath);
    const uploadDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
    // file without associated Hoax
    const attachment = await FileAttachment.create({ filename, uploadDate });

    FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);

    // setTimeout to allow the attachment cleanup service task to complete
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemoval = await FileAttachment.findOne({ where: { id: attachment.id } });
      expect(attachmentAfterRemoval).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      done();
    }, 500);
  });

  it('keeps associated attachments even after 24hs', async (done) => {
    jest.useFakeTimers();
    fs.copyFileSync(testFilePath, targetPath);
    const hoaxId = await postUserAndHoax();
    const uploadDate = new Date(Date.now() - 27 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({ filename, uploadDate, hoaxId });
    FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    // setTimeout to allow the attachment cleanup service task to complete
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemoval = await FileAttachment.findOne({ where: { id: attachment.id } });
      expect(attachmentAfterRemoval).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      done();
    }, 500);
  });
});
