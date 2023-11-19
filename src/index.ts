export default {
  async scheduled(event, env, ctx) {
    // notify
    const notify = async msg => {
      // bark notify
      const barkNotify = async () => {
        const bark = await env.cookies.get("bark")
        if (bark) {
          const barkUrl = `https://api.day.app/${bark}/${encodeURIComponent(
            msg
          )}`
          const response = await fetch(barkUrl)
          return response.status === 200
        }
        return false
      }

      // lark notify
      const larkNotify = async () => {
        const lark = await env.cookies.get("lark")
        if (lark) {
          const larkUrl = `https://open.larksuite.com/open-apis/bot/v2/hook/${lark}`
          // post
          const data = {
            msg_type: "text",
            content: {
              text: msg,
            },
          }
          // post json data
          const response = await fetch(larkUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          })
          return response.status === 200
        }
        return false
      }

      // feishu notify
      const feishuNotify = async () => {
        const feishu = await env.cookies.get("feishu")
        if (feishu) {
          const feishuUrl = `https://open.feishu.cn/open-apis/bot/v2/hook/${lark}`
          // post
          const data = {
            msg_type: "text",
            content: {
              text: msg,
            },
          }
          // post json data
          const response = await fetch(feishuUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          })
          return response.status === 200
        }
        return false
      }

      try {
        const results = await Promise.allSettled([
          barkNotify(),
          larkNotify(),
          feishuNotify(),
        ])
        const tasks = ["bark", "lark", "feishu"]

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            console.log(`Notify ${tasks[index]} OK:`, result)
          } else {
            console.error(`Notify ${tasks[index]} Failed:`, result)
          }
        })
      } catch (error) {
        console.error("Error during notification:", error)
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
        await notify("V2EX Check-in Successful")
        return true
      } else {
        const failedMsg = await resp.text()
        console.error("v2ex failed: " + failedMsg)
        await notify("V2EX Check-in Failed: " + failedMsg)
        return false
      }
    }

    // fanli check in
    const fanliCheckIn = async () => {
      const cookies = await env.cookies.get("fanli")
      if (!cookies) {
        return false
      }

      const fanliUrl = "https://huodong.fanli.com/sign82580"
      const checkInUrl = `${fanliUrl}/ajaxSetUserSign`

      const userAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Fanli/7.19.71.6 (ID:1-1069183-65912421924760-17-0; WVC:WK; SCR:1170*2532-3.0)"
      const headers = {
        "User-Agent": userAgent,
        Cookie: cookies,
        Referer: fanliUrl,
      }
      const resp = await fetch(checkInUrl, { headers })
      if (resp.status === 200) {
        const failedMsg = await resp.text()
        console.log("fanli ok: " + failedMsg)
        await notify("Fanli Check-in Successful")
        return true
      } else {
        const failedMsg = await resp.text()
        console.error("fanli failed: " + failedMsg)
        await notify("Fanli Check-in Failed: " + failedMsg)
        return false
      }
    }

    const results = await Promise.allSettled([v2exCheckIn(), fanliCheckIn()])
    const tasks = ["v2ex", "fanli"]
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
