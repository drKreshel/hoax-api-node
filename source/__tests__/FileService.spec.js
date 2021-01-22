const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir } = require('config').directories;
const FileService = require('../src/file/FileService');

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();
    const folderName = uploadDir;
    expect(fs.existsSync(folderName)).toBe(true);
  });

  it('creates profile folder inside upload folder', () => {
    FileService.createFolders();
    const profileFolder = path.join('.', uploadDir, profileDir);
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
