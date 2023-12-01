// notify
const notify = async (env: any, msg: string, options: any = {}) => {
  const { title, badge, sound, icon, group, url } = options

  // bark notify
  const barkNotify = async () => {
    const token = await env.data.get("bark")
    if (token) {
      const data = {
        body: msg,
        device_key: token,
      }
      title && (data["title"] = title)
      sound && (data["sound"] = sound)
      group && (data["group"] = group)
      url && (data["url"] = url)

      const pushUrl = "https://api.day.app/push"
      const response = await fetch(pushUrl, {
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

  // lark notify
  const larkNotify = async () => {
    const token = await env.data.get("lark")
    if (token) {
      const data = {
        msg_type: "text",
        content: {
          text: msg,
        },
      }
      const pushUrl = `https://open.larksuite.com/open-apis/bot/v2/hook/${token}`
      const response = await fetch(pushUrl, {
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
    const token = await env.data.get("feishu")
    if (token) {
      const data = {
        msg_type: "text",
        content: {
          text: msg,
        },
      }
      const pushUrl = `https://open.feishu.cn/open-apis/bot/v2/hook/${token}`
      const response = await fetch(pushUrl, {
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
