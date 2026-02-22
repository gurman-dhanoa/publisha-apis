const bcrypt = require('bcrypt');

const hash = {
  async make(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  },
  
  async compare(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
};

module.exports = hash;