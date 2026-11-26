const fetch = require("node-fetch");

const requestFetch = function (url, options) {
	return fetch(url, options).then((res) => res.json());
};

/**
 * 优先读环境变量，便于 Actions 不把密钥放进命令行。
 * 本地仍可：node src/xxx.js "<cookie>" "<user>" "<pass>" "<to>"
 */
function readConfig() {
	const cookie = process.env.COOKIE || process.argv[2];
	const user = process.env.USER || process.env.user || process.argv[3];
	const pass = process.env.PASS || process.env.pass || process.argv[4];
	const to = process.env.TO || process.argv[5];
	if (!cookie || !user || !pass || !to) {
		throw new Error("缺少 COOKIE、USER、PASS 或 TO（环境变量或命令行参数）");
	}
	process.env.USER = user;
	process.env.PASS = pass;
	return { cookie, to };
}

module.exports = requestFetch;
module.exports.readConfig = readConfig;
