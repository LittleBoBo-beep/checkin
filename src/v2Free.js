const sendMail = require("./utils/sendMail");
const requestFetch = require("./utils/utils");
const { readConfig } = require("./utils/utils");

const v2freeData = {
	title: "v2free",
	h1: "自动签到",
	notice: "通知",
	status: "",
	msg: "",
	traffic: "",
	trafficInfo: {
		lastUsedTraffic: "",
		todayUsedTraffic: "",
		unUsedTraffic: "",
	},
	unflowtraffic: "",
	ret: null,
};

function applyCheckInResult(payload) {
	if (!payload || typeof payload !== "object") {
		throw new Error("签到接口返回异常");
	}
	const { ret, trafficInfo, ...rest } = payload;
	Object.assign(v2freeData, rest);
	v2freeData.ret = ret;
	v2freeData.status = Number(ret) === 1 ? "成功" : "失败";
	if (trafficInfo && typeof trafficInfo === "object") {
		v2freeData.trafficInfo = {
			lastUsedTraffic: trafficInfo.lastUsedTraffic || "",
			todayUsedTraffic: trafficInfo.todayUsedTraffic || "",
			unUsedTraffic: trafficInfo.unUsedTraffic || "",
		};
	}
	return v2freeData;
}

/**
 * 签到。主站失败时再试备用域名。
 * @param {string} cookie
 * @returns {Promise<object>}
 */
async function checkIn(cookie) {
	const headers = {
		"content-type": "application/json; charset=utf-8",
		accept: "application/json, text/javascript, */*; q=0.01",
		Cookie: cookie,
	};
	const urls = [
		"https://go.tofly.cyou/user/checkin",
		"https://w1.v2dns.xyz/user/checkin",
	];
	let lastError;
	for (const url of urls) {
		try {
			const check_in = await requestFetch(url, {
				headers,
				method: "POST",
			});
			return applyCheckInResult(check_in);
		} catch (e) {
			lastError = e;
			console.error(`签到请求失败 ${url}:`, e.message || e);
		}
	}
	throw lastError;
}

/**
 * @param {string} cookie
 * @param {string} to
 */
async function getMsgStatus(cookie, to) {
	const { traffic, msg, trafficInfo, status, title, h1 } = v2freeData;
	const { lastUsedTraffic, todayUsedTraffic, unUsedTraffic } = trafficInfo;
	let html = '<h1 style="text-align: center">自动签到通知</h1>';
	const obj = compileCookie(cookie);
	if (obj.email) {
		let email = obj.email;
		try {
			email = decodeURIComponent(obj.email);
		} catch (e) {
			console.error("decodeURIComponent:", e.message);
		}
		html += `<p style="text-indent: 2em">签到账号${email}</p>`;
	}
	html += `<p style="text-indent: 2em">签到结果：${msg || status}</p>`;
	if (traffic) {
		html += `
			<p style="text-indent: 2em">全部获得${traffic}</p>
			<p style="text-indent: 2em">已使用${lastUsedTraffic}</p>
			<p style="text-indent: 2em">今日使用${todayUsedTraffic}</p>
			<p style="text-indent: 2em">签到之前剩余${unUsedTraffic}</p>
		`;
	}
	return sendMail({
		from: title,
		to,
		subject: h1 + status,
		html,
	});
}

/**
 * @param {string} cookie
 * @return {Record<string, string>}
 */
function compileCookie(cookie) {
	const obj = {};
	cookie.split(";").forEach((item) => {
		const eq = item.indexOf("=");
		if (eq === -1) return;
		obj[item.slice(0, eq).trim()] = item.slice(eq + 1);
	});
	return obj;
}

(async function () {
	let to;
	let mailed = false;
	try {
		const config = readConfig();
		to = config.to;
		await checkIn(config.cookie);
		await getMsgStatus(config.cookie, to);
		mailed = true;
		if (Number(v2freeData.ret) !== 1) {
			console.error("v2free 签到失败:", v2freeData.msg || "签到失败");
			process.exitCode = 1;
			return;
		}
		console.log("v2free 签到完成");
	} catch (e) {
		console.error("v2free 签到失败:", e);
		if (to && !mailed) {
			try {
				if (!v2freeData.msg) {
					v2freeData.msg = e && e.message ? e.message : String(e);
				}
				if (Number(v2freeData.ret) !== 1) {
					v2freeData.status = "失败";
				}
				const config = readConfig();
				await getMsgStatus(config.cookie, to);
			} catch (mailErr) {
				console.error("失败通知邮件发送失败:", mailErr);
			}
		}
		process.exitCode = 1;
	}
})();
