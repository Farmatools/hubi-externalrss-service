const Bcrypt = require("bcrypt-nodejs");
const Uuidv1 = require('uuid/v1');

module.exports = {
    createUUID() {
        return Uuidv1();
    },
    createHash(pw) {
        return Bcrypt.hashSync(pw, Bcrypt.genSaltSync(8), null);
    },
    isPasswordValid(pw, hash) {
        return Bcrypt.compareSync(pw, hash);
    }
};