const request = require('supertest');
const fs = require('fs');
const path = require('path');
const config = require('config');
const app = require('../src/app');

const {
  uploadDir: uploadDirectory,
  profileDir: profileDirectory,
  attachmentsDir: attachmentsDirectory,
} = config.directories;
const profilePath = path.join('.', uploadDirectory, profileDirectory);
const attachmentsPath = path.join('.', uploadDirectory, attachmentsDirectory);

describe('Profile images', () => {
  // creates a copy of an existing image to retrieve its random name and test if the file with that name is static served
  const copyImageFile = (name) => {
    const filepath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFilename = name;
    const storedFilePath = path.join(profilePath, storedFilename);
    fs.copyFileSync(filepath, storedFilePath);
    return storedFilename;
  };
  it('returns "404" Not Found when file is not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  it('returns "200" Ok when file exists', async () => {
    const storedFilename = copyImageFile('test-file');
    const response = await request(app).get(`/images/${storedFilename}`);
    expect(response.status).toBe(200);
  });

  it('returns cache for 1 year in response', async () => {
    const storedFilename = copyImageFile('test-file');
    const response = await request(app).get(`/images/${storedFilename}`);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});

describe('Attachments', () => {
  const copyAttachmentFile = (name) => {
    const filepath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFilename = name;
    const storedFilePath = path.join(attachmentsPath, storedFilename);
    fs.copyFileSync(filepath, storedFilePath);
    return storedFilename;
  };

  it('returns "404" Not Found when file is not found', async () => {
    const response = await request(app).get('/attachments/123456');
    expect(response.status).toBe(404);
  });

  it('returns "200" Ok when file exists', async () => {
    const storedFilename = copyAttachmentFile('test-attachment-file');
    const response = await request(app).get(`/attachments/${storedFilename}`);
    expect(response.status).toBe(200);
  });

  it('returns cache for 1 year in response', async () => {
    const storedFilename = copyAttachmentFile('test-attachment-file');
    const response = await request(app).get(`/attachments/${storedFilename}`);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});
