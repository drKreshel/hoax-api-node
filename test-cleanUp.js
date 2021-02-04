const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir, attachmentsDir } = require('config').directories;

const profileImageDirectory = path.join('.', uploadDir, profileDir);
const attachmentsDirectory = path.join('.', uploadDir, attachmentsDir);

// deletes upload-test folder files after all tests are completed
const clearFolder = (folder) => {
  const files = fs.readdirSync(folder);
  for (const file of files) {
    fs.unlinkSync(path.join(folder, file));
  }
};

clearFolder(profileImageDirectory);
clearFolder(attachmentsDirectory);
