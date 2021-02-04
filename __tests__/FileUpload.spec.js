const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { uploadDir, attachmentsDir } = require('config').directories;
const app = require('../src/app');
const { FileAttachment } = require('../src/associations');
const sequelize = require('../src/config/database');

// languages
const en = require('../locales/en/translation.json');
const de = require('../locales/de/translation.json');

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
});

const uploadFile = (file = 'test-png.png', options = {}) => {
  const agent = request(app).post('/api/1.0/hoaxes/attachments');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.attach('file', path.join('.', '__tests__', 'resources', file));
};

describe('Upload File for Hoax', () => {
  it('returns "200" Ok after succesful upload', async () => {
    const response = await uploadFile();
    expect(response.status).toBe(200);
  });

  it('saves dynamicFilename, uploadDate as attachment object in database', async () => {
    const beforeSubmit = Date.now();
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.filename).not.toBe('test-png.png');
    expect(attachment.uploadDate.getTime()).toBeGreaterThan(beforeSubmit);
  });

  it('saves file to attachment folder', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    const filepath = path.join('.', uploadDir, attachmentsDir, attachment.filename);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it.each`
    file              | filetype
    ${'test-png.png'} | ${'image/png'}
    ${'test-png'}     | ${'image/png'}
    ${'test-jpg.jpg'} | ${'image/jpeg'}
    ${'test-gif.gif'} | ${'image/gif'}
    ${'test-pdf.pdf'} | ${'application/pdf'}
    ${'test-txt.txt'} | ${null}
  `('saves filetype as "$filetype" in database when $file is uploaded', async ({ file, filetype }) => {
    await uploadFile(file);
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.filetype).toBe(filetype);
  });

  it.each`
    file              | extension
    ${'test-png.png'} | ${'png'}
    ${'test-png'}     | ${'png'}
    ${'test-jpg.jpg'} | ${'jpg'}
    ${'test-gif.gif'} | ${'gif'}
    ${'test-pdf.pdf'} | ${'pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves filename with extension "$extension" in attachment object and stored object when file is uploaded',
    async ({ file, extension }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      if (file === 'test-txt.txt') {
        expect(attachment.filename.endsWith('txt')).toBe(false);
      } else {
        expect(attachment.filename.endsWith(extension)).toBe(true);
      }
      const filepath = path.join('.', uploadDir, attachmentsDir, attachment.filename);
      expect(fs.existsSync(filepath)).toBe(true);
    }
  );

  it('returns "400" Bad Request when uploaded file size is bigger than 5mb', async () => {
    const fiveMbFile = 'a'.repeat(5 * 1024 * 1024);
    const filepath = path.join('.', '__tests__', 'resources', 'test-5MBFile');
    // eslint-disable-next-line prefer-template
    fs.writeFileSync(filepath, fiveMbFile + 'a' /* An extra 'a' for surpassing the 5mb limit */);
    const response = await uploadFile('test-5MBFile');
    expect(response.status).toBe(400);
    fs.unlinkSync(filepath);
  });

  it('returns "200" Ok when uploaded file size is 5mb', async () => {
    const fiveMbFile = 'a'.repeat(5 * 1024 * 1024);
    const filepath = path.join('.', '__tests__', 'resources', 'test-5MBFile');
    // eslint-disable-next-line prefer-template
    fs.writeFileSync(filepath, fiveMbFile);
    const response = await uploadFile('test-5MBFile');
    expect(response.status).toBe(200);
    fs.unlinkSync(filepath);
  });

  it.each`
    language | message
    ${'en'}  | ${en.attachment_size_limit}
    ${'de'}  | ${de.attachment_size_limit}
  `('returns "message" when attachment size is bigger than 5mb', async ({ language, message }) => {
    const now = Date.now();
    const fiveMbFile = 'a'.repeat(5 * 1024 * 1024);
    const filepath = path.join('.', '__tests__', 'resources', 'test-5MBFile');
    // eslint-disable-next-line prefer-template
    fs.writeFileSync(filepath, fiveMbFile + 'a' /* An extra byte for surpassing the 5mb limit */);
    const response = await uploadFile('test-5MBFile', { language });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/hoaxes/attachments');
    expect(error.message).toBe(message);
    expect(error.timestamp).toBeGreaterThan(now);
    fs.unlinkSync(filepath);
  });

  it('returns attachmend id in response', async () => {
    const response = await uploadFile();
    expect(Object.keys(response.body)).toEqual(['id']);
  });
});
