import notify from "../notify"

// v2ex check in
const v2ex = async env => {
  const cookie = await env.data.get("v2ex")
  if (!cookie) {
    return false
  }

  if (await task(cookie)) {
    await notify(env, "V2EX 签到成功")
    return true
  } else {
    await notify(env, "V2EX 签到失败")
    return false
  }
}

const task = async cookie => {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
  const v2exDomain = "https://www.v2ex.com"
  const dailyUrl = v2exDomain + "/mission/daily"
  const redeemUrl = v2exDomain + "/mission/daily/redeem"

  const getDailyReward = async () => {
    const headers = {
      "User-Agent": userAgent,
      Cookie: cookie,
      Referer: v2exDomain,
    }

    let response = await fetch(dailyUrl, { headers })
    let html = await response.text()

    if (html.includes("/signin")) {
      return { success: false, message: "登录状态已失效" }
    }

    if (html.includes("每日登录奖励已领取")) {
      return { success: true, message: "每日登录奖励已领取" }
    }

    const regex = /redeem\?once=([^']*)'/
    const result = html.match(regex)
    if (!result) {
      return { success: false, message: "无法获取once参数" }
    }

    const once = result[1]
    response = await fetch(`${redeemUrl}?once=${once}`, { headers })
    html = await response.text()

    response = await fetch(dailyUrl, { headers })
    html = await response.text()

    if (html.includes("每日登录奖励已领取")) {
      return { success: true, message: "每日登录奖励领取成功" }
    }
    return { success: false, message: "每日登录奖励领取失败" }
  }

  const resp = await getDailyReward()
  if (resp.success) {
    return true
  }
  console.error(resp.message)
  return false
}

export default v2ex
