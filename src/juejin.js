const fetch = require("node-fetch");
const sendMail = require("../sendMail");

const [cookie, user, pass, to] = process.argv.slice(2);

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

// 抽奖
const drawFn = async () => {
  // 查询今日是否有免费抽奖机会
  const today = await fetch(
    "https://api.juejin.cn/growth_api/v1/lottery_config/get",
    {
      headers,
      method: "GET",
      credentials: "include",
    }
  ).then((res) => res.json());

  if (today.err_no !== 0) return Promise.reject("已经签到！免费抽奖失败！");
  if (today.data.free_count === 0)
    return Promise.resolve("签到成功！今日已经免费抽奖！");

  // 免费抽奖
  const draw = await fetch("https://api.juejin.cn/growth_api/v1/lottery/draw", {
    headers,
    method: "POST",
    credentials: "include",
  }).then((res) => res.json());
  // {"err_no":0,"err_msg":"success","data":{"lottery":[{"lottery_id":"6981716980386496552","lottery_name":"随机矿石","lottery_type":1,"lottery_image":"https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/32ed6a7619934144882d841761b63d3c~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image","unlock_count":0},{"lottery_id":"6981716405976743943","lottery_name":"Bug","lottery_type":2,"lottery_image":"https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0a4ce25d48b8405cbf5444b6195928d4~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image","unlock_count":0},{"lottery_id":"7090359937317994503","lottery_name":"「码赛克」掘金贴纸","lottery_type":4,"lottery_image":"https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/77d5e1e091a944b1b894029d22cdfcf0~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image?","unlock_count":0},{"lottery_id":"7088615500954992644","lottery_name":"「码赛克」线圈毛巾","lottery_type":4,"lottery_image":"https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/77b634472b7f4700a4060edbd8cb3cf3~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image?","unlock_count":0},{"lottery_id":"6981709286694977549","lottery_name":"Yoyo抱枕","lottery_type":3,"lottery_image":"https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/515ebe113d8d407fa5d36191257ce583~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image","unlock_count":0},{"lottery_id":"7107519448088576031","lottery_name":"哔哩哔哩大会员月卡","lottery_type":4,"lottery_image":"https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/defea02506f040849e95cebf350086de~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image?","unlock_count":0},{"lottery_id":"7103338281479176192","lottery_name":"Click午睡枕","lottery_type":3,"lottery_image":"https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f0ff284106b44aebf7281900d1707bf~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image?","unlock_count":0},{"lottery_id":"7102706037760720930","lottery_name":"字节咖啡保温杯","lottery_type":3,"lottery_image":"https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa31d47d93ce4793a50b664a3e032b18~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image?","unlock_count":0},{"lottery_id":"6981696205310918691","lottery_name":"Switch","lottery_type":3,"lottery_image":"https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/215f7217aa3a48dfa4dbb69976e92b1b~tplv-k3u1fbpfcp-no-mark:0:0:0:0.image","unlock_count":1}],"free_count":0,"point_cost":200}}
  if (draw.err_no !== 0) return Promise.reject("已经签到！免费抽奖异常！");
  if (draw.data.lottery_type === 1) score += 66;
  await lucky();
  return Promise.resolve(`签到成功！恭喜抽到：${draw.data.lottery_name}`);
};

// 签到
(async () => {
  // 查询今日是否已经签到
  const today_status = await fetch(
    "https://api.juejin.cn/growth_api/v1/get_today_status",
    {
      headers,
      method: "GET",
      credentials: "include",
    }
  ).then((res) => res.json());
  // {"err_no":0,"err_msg":"success","data":true}
  if (today_status.err_no !== 0) return Promise.reject("签到失败！");
  if (today_status.data) return Promise.resolve("今日已经签到！");

  // 签到
  const check_in = await fetch("https://api.juejin.cn/growth_api/v1/check_in", {
    headers,
    method: "POST",
    credentials: "include",
  }).then((res) => res.json());
  // {"err_no":0,"err_msg":"success","data":{"incr_point":100,"sum_point":27712}}
  if (check_in.err_no !== 0) return Promise.reject("签到异常！");
  return Promise.resolve(`签到成功！当前积分；${check_in.data.sum_point}`);
})()
  .then((msg) => {
    return fetch("https://api.juejin.cn/growth_api/v1/get_cur_point", {
      headers,
      method: "GET",
      credentials: "include",
    }).then((res) => res.json());
    // {"err_no":0,"err_msg":"success","data":27812}
  })
  .then((res) => {
    score = res.data;
    return drawFn();
  })
  .then((msg) => {
    return sendMail({
      from: "掘金",
      to,
      subject: "定时任务成功",
      html: `
        <h1 style="text-align: center">自动签到通知</h1>
        <p style="text-indent: 2em">签到结果：${msg}</p>
        <p style="text-indent: 2em">当前积分：${score}</p><br/>
      `,
    }).catch(console.error);
  })
  .then(() => {
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

/**
 * @desc 沾喜气
 */
//  ?aid=&uuid=
const lucky = async () => {
  const res = await fetch(
    "https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky",
    {
      headers,
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ lottery_history_id: "7052109119238438925" }),
    }
  ).then((res) => res.json());
};
