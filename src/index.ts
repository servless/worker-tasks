export default {
  async scheduled(event, env, ctx) {
    // bark notify
    const barkNotify = async msg => {
      const bark = await env.cookies.get("bark")
      if (bark) {
        const barkUrl = `https://api.day.app/${bark}/${msg}`
        await fetch(barkUrl)
      }
    }

    // v2ex check in
    const v2exCheckIn = async () => {
      const userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
      const v2exDomain = "https://www.v2ex.com"
      const dailyUrl = v2exDomain + "/mission/daily"
      const redeemUrl = v2exDomain + "/mission/daily/redeem"

      async function getDailyReward(cookies) {
        const headers = {
          "User-Agent": userAgent,
          Cookie: cookies,
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

        if (!html.includes("每日登录奖励已领取")) {
          return { success: false, message: "每日登录奖励领取失败" }
        }

        return { success: true, message: "每日登录奖励领取成功" }
      }

      async function handleRequest() {
        const cookies = await env.cookies.get("v2ex")
        if (cookies) {
          const result = await getDailyReward(cookies)
          return new Response(result.message, {
            status: result.success ? 200 : 400,
          })
        }
        return new Response("请提供登录凭据", { status: 400 })
      }

      const resp = await handleRequest()
      if (resp.status === 200) {
        await barkNotify("V2EX Check-in Successful")
      } else {
        const failedMsg = await resp.text()
        console.error("v2ex failed: " + failedMsg)
        await barkNotify("V2EX Check-in Failed: " + failedMsg)
      }

      return resp
    }

    const results = await Promise.allSettled([v2exCheckIn()])
    const tasks = ["v2ex"]
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Result ${tasks[index]} OK:`, result)
      } else {
        console.error(`Result ${tasks[index]} Failed:`, result)
      }
    })

    console.log("cron processed")
  },
}
