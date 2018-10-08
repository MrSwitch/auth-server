'use strict';

// Nodejs encryption with CTR
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = 'd6F3Efeq';

module.exports.encrypt = json => {
	const text = JSON.stringify(json);
	const cipher = crypto.createCipher(algorithm, password);
	let crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;
};

module.exports.decrypt = text => {
	const decipher = crypto.createDecipher(algorithm, password);
	let dec = decipher.update(text, 'hex', 'utf8');
	dec += decipher.final('utf8');
	const json = JSON.parse(dec);
	return json;
};
