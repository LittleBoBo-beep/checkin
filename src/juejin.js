const sendMail = require("./utils/sendMail");
const { readConfig } = require("./utils/utils");
const JuejinHelper = require("juejin-helper");

const CHECK_IN_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function addHtmlText(name, value) {
	return `<p style="text-indent: 2em">${name}: ${value}</p><br/>`;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkIn(growth) {
	let lastError;
	for (let i = 0; i < CHECK_IN_RETRIES; i++) {
		try {
			return await growth.checkIn();
		} catch (e) {
			lastError = e;
			console.error(`签到失败 (${i + 1}/${CHECK_IN_RETRIES}):`, e.message);
			if (i < CHECK_IN_RETRIES - 1) {
				await sleep(RETRY_DELAY_MS);
			}
		}
	}
	throw lastError;
}

async function run(cookie, to) {
	let html = '<h1 style="text-align: center">掘金自动化通知</h1>';
	const juejin = new JuejinHelper();
	await juejin.login(cookie);

	try {
		const growth = juejin.growth();
		const checkedIn = await growth.getTodayStatus();

		if (checkedIn) {
			html += addHtmlText("是否签到", "已经签到");
		} else {
			const res = await checkIn(growth);
			html += addHtmlText(
				"签到",
				`签到成功！获得${res.incr_point}矿石，现有${res.sum_point}矿石`
			);
		}

		const points = await growth.getCurrentPoint();
		html += addHtmlText("当前矿石数", points);

		const counts = await growth.getCounts();
		html += addHtmlText("统计签到天数", counts.cont_count);

		try {
			const lottery = await growth.drawLottery();
			html += addHtmlText("抽奖", lottery.lottery_name);
		} catch (e) {
			console.error("抽奖失败:", e.message);
			html += addHtmlText("抽奖", `失败：${e.message}`);
		}

		try {
			const lucky = await growth.getMyLucky();
			html += addHtmlText("幸运值", lucky.total_value);
		} catch (e) {
			console.error("获取幸运值失败:", e.message);
			html += addHtmlText("幸运值", `获取失败：${e.message}`);
		}
	} finally {
		try {
			await juejin.logout();
		} catch (e) {
			console.error("登出失败:", e.message);
		}
	}

	await sendMail({
		from: "掘金",
		to,
		subject: "定时任务成功",
		html,
	});
}

async function main() {
	let to;
	try {
		const config = readConfig();
		to = config.to;
		await run(config.cookie, to);
		console.log("掘金签到完成");
	} catch (err) {
		console.error("掘金签到失败:", err);
		if (to) {
			try {
				await sendMail({
					from: "掘金",
					to,
					subject: "定时任务失败",
					html:
						'<h1 style="text-align: center">掘金自动化通知</h1>' +
						addHtmlText("结果", "失败") +
						addHtmlText("原因", err && err.message ? err.message : err),
				});
			} catch (mailErr) {
				console.error("失败通知邮件发送失败:", mailErr);
			}
		}
		process.exitCode = 1;
	}
}

main();
