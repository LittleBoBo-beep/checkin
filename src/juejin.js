const requestFetch = require("./utils/utils");
const sendMail = require("./utils/sendMail");

const JueJinHelper = require("juejin-helper");

let [cookie, user, pass, to] = process.argv.slice(2);
process.env.user = user;
process.env.pass = pass;
let score = 0;
const headers = {
  "content-type": "application/json; charset=utf-8",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua":
    '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  referer: "https://juejin.cn/",
  accept: "*/*",
  cookie,
};
const noticeMsg = {
	point: '',
	checkInStatus: '',
	getLucky: '',
	prize: '',
	prizeState: '',
	hasBug: '',
	noBugFix: '',
	seaGold: ''
}
// 抽奖
const drawFn = async () => {
	/**
	 * 查询今日是否有免费抽奖机会
	 */
  const today = await requestFetch(
    "https://api.juejin.cn/growth_api/v1/lottery_config/get",
    {
      headers,
      method: "GET",
      credentials: "include",
    }
  )
  if (today.err_no !== 0) {
	  noticeMsg.prizeState = '免费抽奖失败！';
	  return Promise.resolve();
  }
  if (today.data.free_count === 0) {
	  noticeMsg.prizeState = '今日已经免费抽奖！';
	  return Promise.resolve();
  }

  // 免费抽奖
  const draw = await requestFetch("https://api.juejin.cn/growth_api/v1/lottery/draw", {
    headers,
    method: "POST",
    credentials: "include",
  })
  if (draw.err_no !== 0) {
	  noticeMsg.prizeState = "免费抽奖异常！";
	  return Promise.resolve();
  }
  // if (draw.data.lottery_type === 1) score += 66;
  await lucky();
  noticeMsg.getLucky = '沾喜气成功~';
  noticeMsg.prize = `恭喜抽到：${draw.data.lottery_name}`
  return Promise.resolve();
};

/**
 * 获取签到状态
 * @return {Promise<{"err_no":number ,"err_msg":string,"data":boolean}>}
 */
function getCheckStatus() {
	// 查询今日是否已经签到
	// {"err_no":0,"err_msg":"success","data":true}
	return requestFetch(
			"https://api.juejin.cn/growth_api/v1/get_today_status",
			{
				headers,
				method: "GET",
				credentials: "include",
			}
	)
}

/**
 * 签到
 * @return {Promise<{"err_no":number,"err_msg":string,"data":{"incr_point":number,"sum_point":number}}>}
 */
async function checkIn() {
	// 签到
	return requestFetch("https://api.juejin.cn/growth_api/v1/check_in", {
		headers,
		method: "POST",
		credentials: "include",
	})
	// {"err_no":0,"err_msg":"success","data":{"incr_point":100,"sum_point":27712}}
}

/**
 * 获取当前矿石
 * @return {Promise<{"err_no":number,"err_msg":string,"data": number}>}
 */
function getCurPoint() {
	// {"err_no":0,"err_msg":"success","data":27812}
	return requestFetch("https://api.juejin.cn/growth_api/v1/get_cur_point", {
		headers,
		method: "GET",
		credentials: "include",
	})
}

/**
 * @desc 沾喜气
 */
//  ?aid=&uuid=
const lucky = async () => {
  return await requestFetch(
    "https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky",
    {
      headers,
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ lottery_history_id: "7052109119238438925" }),
    }
  )
};
// 掘金 BUGFIX
const bugFix = async function () {
	const jueJin = new JueJinHelper();
	await jueJin.login(cookie);

	const bugfix = jueJin.bugfix();
	// 获取未收集的bug列表
	const notCollectBugList = await bugfix.getNotCollectBugList();
	await bugfix.collectBugBatch(notCollectBugList);

	const competition = await bugfix.getCompetition();
	const bugfixInfo = await bugfix.getUser(competition);
	let gameInfo
	try {
		gameInfo = await autoSeaGold(jueJin)
	} catch (e) {
		console.error('autoSeaGold:', e)
		noticeMsg.seaGold = '游戏异常~';
	}
	noticeMsg.hasBug = `BUG的数量${notCollectBugList.length}`
	noticeMsg.noBugFix = `未消除的BUG：${bugfixInfo.user_own_bug}`
	console.log('gameInfo:', gameInfo)
}
// 掘金 自动
const autoSeaGold = async function (jueJin) {
	const seaGold = jueJin.seagold();

	await seaGold.gameLogin(); // 登陆游戏

	let gameInfo;

	const info = await seaGold.gameInfo(); // 游戏状态
	if (info.gameStatus === 1) {
		gameInfo = info.gameInfo; // 继续游戏
	} else {
		gameInfo = await seaGold.gameStart(); // 开始游戏
	}

	const command = ["U", "L"];
	let result;
	try {
		await seaGold.gameCommand(Number(gameInfo.gameId), command); // 执行命令
		result = await seaGold.gameOver(); // 游戏结束
	} catch (e) {
		console.error('[error]:', e);
	}
	noticeMsg.seaGold = '游戏结束';
	console.log(result); // => { ... }

	await jueJin.logout();
	return result;
}



// async function run() {
// 	const jueJin = new JueJinHelper();
// 	await jueJin.login(cookie);
//
// 	const growth = jueJin.growth();
//
// 	// 签到
// 	await growth.checkIn();
//
// 	// 获取今日签到状态
// 	const checkInStats = await growth.getTodayStatus();
// 	console.log(checkInStats)
// 	// 获取当前矿石数
// 	// await growth.getCurrentPoint();
//
// 	// 获取统计签到天数
// 	// await growth.getCounts();
//
//
// 	// 获取抽奖配置
// 	// await growth.getLotteryConfig();
//
// 	// 抽奖
// 	// await growth.drawLottery();
//
// 	// 获取抽奖幸运用户
// 	// await growth.getLotteriesLuckyUsers({ page_no = 1, page_size = 5 }); // => { lotteries: [{ lottery_history_id }, ...] }
//
// 	// 获取我的幸运值
// 	// await growth.getMyLucky();
//
// 	// 沾喜气
// 	// await growth.dipLucky(lottery_history_id); // => { has_dip, dip_value, total_value, dip_action }
//
// 	await jueJin.logout();
// }


function run() {
	(async () => {
		const checkStatus = await getCheckStatus()
		if (checkStatus.err_no !== 0) {
			noticeMsg.checkInStatus = '签到失败！'
			return Promise.resolve();
		}
		if (checkStatus.data) {
			noticeMsg.checkInStatus = '今日已经签到！'
			return Promise.resolve();
		}
		const check_in = await checkIn();
		if (check_in.err_no !== 0) {
			noticeMsg.checkInStatus = "签到异常！"
			return Promise.resolve();
		}
		noticeMsg.checkInStatus = `签到成功！当前积分；${check_in.data.sum_point}`
		return Promise.resolve();
	})()
	.then(async () => {
		// {"err_no":0,"err_msg":"success","data":27812}
		// 查询当前矿石数量
		const res = await getCurPoint();
		score = res.data;
		// 抽奖
		await drawFn();
		// BUGFIX
		// const { notCollectBugList,bugfixInfo, gameInfo } =
		// try {
			// await bugFix();
		// } catch (e) {
		// 	console.log(e)
		// }
		// console.log(bugfixInfo, gameInfo)
		let html = '<h1 style="text-align: center">掘金自动化通知</h1>'
		for (const noticeMsgKey in noticeMsg) {
			if (noticeMsg.hasOwnProperty(noticeMsgKey) && noticeMsg[noticeMsgKey]) {
				html += `<p style="text-indent: 2em">${noticeMsg[noticeMsgKey]}</p><br/>`
			}
		}
        // <p style="text-indent: 2em">签到结果：${msg}</p>
        // <p style="text-indent: 2em">当前积分：${score}</p><br/>
        // <p style="text-indent: 2em">收集BUG：${notCollectBugList.length}</p><br/>
        // <p style="text-indent: 2em">未消除的BUG：${bugfixInfo.user_own_bug}</p><br/>
		return sendMail({
			from: "掘金",
			to,
			subject: "定时任务成功",
			html,
		}).catch(console.error);
	})
	.catch((err) => {
		sendMail({
			from: "掘金",
			to,
			subject: "定时任务失败",
			html: `
        <h1 style="text-align: center">自动签到通知</h1>
        <p style="text-indent: 2em">执行结果：${err}</p>
        <p style="text-indent: 2em">当前积分：${score}</p><br/>
      `,
		}).catch(console.error);
	});
}
run();
