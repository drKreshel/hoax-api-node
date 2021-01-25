const fs = require('fs');
const path = require('path');
const { uploadDir, profileDir } = require('config').directories;

const profileImageDir = path.join('.', uploadDir, profileDir);

// deletes upload-test folder files after all tests are completed
const files = fs.readdirSync(profileImageDir);
for (const file of files) {
  fs.unlinkSync(path.join(profileImageDir, file));
}