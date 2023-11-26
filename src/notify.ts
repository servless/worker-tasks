// notify
const notify = async (env, msg) => {
  // bark notify
  const barkNotify = async () => {
    const bark = await env.data.get("bark")
    if (bark) {
      const barkUrl = `https://api.day.app/${bark}/${encodeURIComponent(msg)}`
      const response = await fetch(barkUrl)
      return response.status === 200
    }
    return false
  }

  // lark notify
  const larkNotify = async () => {
    const lark = await env.data.get("lark")
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
    const feishu = await env.data.get("feishu")
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

export default notify
