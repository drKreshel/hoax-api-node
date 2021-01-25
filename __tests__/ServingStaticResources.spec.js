const request = require('supertest');
const fs = require('fs');
const path = require('path');
const config = require('config');
const app = require('../src/app');

const { uploadDir, profileDir } = config.directories;
const profileFolder = path.join('.', uploadDir, profileDir);

const createNewStoredImage = (name) => {
  const testResourcesFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');
  const storedFilename = name;
  const storedFilePath = path.join(profileFolder, storedFilename);
  fs.copyFileSync(testResourcesFilePath, storedFilePath);
  return storedFilename;
};

describe('Profile images', () => {
  it('returns "404" Not Found when file is not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  it('returns "200" Ok when file exists', async () => {
    const storedFilename = createNewStoredImage('test-file');
    const response = await request(app).get(`/images/${storedFilename}`);
    expect(response.status).toBe(200);
  });

  it('returns cache for 1 year in response', async () => {
    const storedFilename = createNewStoredImage('test-file');
    const response = await request(app).get(`/images/${storedFilename}`);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(`max-age=${oneYearInSeconds}`);
  });
});
