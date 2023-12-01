import notify from "../notify"

// megstudio check in
const megstudio = async (env: any) => {
  const usernameStr = await env.data.get("megstudio_username")
  if (!usernameStr) {
    return false
  }
  const passwordStr = await env.data.get("megstudio_password")
  if (!passwordStr) {
    return false
  }
  const ocrUrl = await env.data.get("ocr_url")
  if (!ocrUrl) {
    return false
  }

  const usernames = usernameStr.split(";")
  const passwords = passwordStr.split(";")
  if (usernames.length !== passwords.length) {
    return false
  }

  const message: string[] = []
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i].trim()
    const password = passwords[i].trim()

    if (!username || !password) {
      continue
    }
    const success = await task(username, password, ocrUrl)
    message.push(`${username} 签到${success ? "成功" : "失败"} \n`)
  }

  await notify(env, "「MegStudio」\n" + message.join(""))
  return true
}

const task = async (username: string, password: string, ocrUrl: string) => {
  // base64 string to uint8array
  const b64decode = (base64String: string) => {
    const binaryString = atob(base64String)
    const length = binaryString.length
    const uint8Array = new Uint8Array(length)

    for (let i = 0; i < length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }

    return uint8Array
  }

  // checkin
  const checkin = async (
    uid: number | string,
    token: string,
    cookie: string
  ) => {
    const checkinApi = `https://studio.brainpp.com/api/v1/users/${uid}/point-actions/checkin`
    const headers = {
      Referer: "https://studio.brainpp.com/",
      "X-Csrf-Token": token,
      Cookie: cookie,
    }

    const response = await fetch(checkinApi, {
      method: "POST",
      headers: headers,
    })

    console.log(response.status)
    if (response.status === 200) {
      return { success: true, message: "MegStudio 签到成功" }
    }
    if (response.status === 403) {
      return { success: true, message: "MegStudio 已签到过" }
    }
    return { success: false, message: "MegStudio 签到失败" }
  }

  // login
  const login = async () => {
    const loginUrl =
      "https://studio.brainpp.com/api/authv1/login?redirectUrl=https://studio.brainpp.com/"
    const loginResponse = await fetch(loginUrl)
    if (loginResponse.status !== 200) {
      return { success: false, message: "MegStudio 无法获取登录信息" }
    }

    const parsedUrl = new URL(loginResponse.url)
    const queryParams = parsedUrl.searchParams
    const loginChallengeValue = queryParams.get("login_challenge") || ""
    if (!loginChallengeValue) {
      return {
        success: false,
        message: "MegStudio 无法获取 login_challenge 参数值",
      }
    }

    const currentTime = String(Math.floor(Date.now()))
    const captchaUrl = `https://account.megvii.com/api/v1/captcha?endpoint=login&_t=${currentTime}`

    const captchaResponse = await fetch(captchaUrl)
    const captchaData: any = await captchaResponse.json()
    if (captchaData.error_code !== 0) {
      return {
        success: false,
        message: "MegStudio 无法获取验证码信息",
      }
    }

    const bizId = captchaData.data.biz_id
    const imageBase64 = captchaData.data.image
    const imageData = b64decode(imageBase64)

    // const imageBuffer = Buffer.from(imageData, 'base64');
    const formData = new FormData()
    formData.append("image", new Blob([imageData]), "captcha.png")

    const captchaResponseCode = await fetch(`${ocrUrl}/ocr/file`, {
      method: "POST",
      body: formData,
    })

    const captcha = await captchaResponseCode.text()
    // console.log(`captcha: ${captcha}`)
    if (captcha == "" || captcha.length != 4) {
      return {
        success: false,
        message: "MegStudio 无法提取验证码字符串",
      }
    }

    const loginApi = "https://account.megvii.com/api/v1/login"
    const headers = {
      Referer: "https://studio.brainpp.com/",
      "Content-Type": "application/json",
    }

    const loginData = {
      username: username,
      password: password,
      code: captcha,
      biz_id: bizId,
      login_challenge: loginChallengeValue,
    }

    const loginDataResponse = await fetch(loginApi, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(loginData),
    })
    if (loginDataResponse.status !== 200) {
      return {
        success: false,
        message: `MegStudio 登录失败: ${await loginDataResponse.text()}`,
      }
    }

    const loginResp: any = await loginDataResponse.json()
    if (loginResp.error_code !== 0) {
      return {
        success: false,
        message: `MegStudio 登录失败: ${loginResp.error_msg}`,
      }
    }
    if (loginResp.data.code !== 0) {
      return {
        success: false,
        message: `MegStudio 登录失败: ${loginResp.data.code}`,
      }
    }
    const redirectUrl = loginResp.data.redirect
    let sessionCookie = loginDataResponse.headers.get("Set-Cookie") || ""
    // allow_redirects 设置为 False，避免重定向请求
    let response = await fetch(redirectUrl, {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
      },
      redirect: "manual",
    })
    sessionCookie = response.headers.get("Set-Cookie") || ""
    // console.log(`sessionCookie: ${sessionCookie}`)

    // 处理多级 302 跳转
    while (response.status === 302) {
      // 获取当前响应的 URL
      const currentUrl = response.headers.get("Location") || ""
      if (!currentUrl) {
        break
      }
      // console.log(currentUrl);

      // 发送下一次跳转请求，继续禁用自动跟踪重定向
      response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          Cookie: sessionCookie,
        },
        redirect: "manual",
      })
      const currentCookie = response.headers.get("Set-Cookie")
      if (currentCookie) {
        sessionCookie = currentCookie
      }
    }

    const respText = await response.text()
    // 从网页源码中获取 X-CSRF-Token
    const csrfTokenMatch = /<meta name=X-CSRF-Token content="([^"]+)"/.exec(
      respText
    )
    if (!csrfTokenMatch) {
      return {
        success: false,
        message: "MegStudio 无法获取 X-CSRF-Token",
      }
    }
    const csrfToken = csrfTokenMatch[1]
    if (!csrfToken) {
      return {
        success: false,
        message: "MegStudio 无法获取 X-CSRF-Token 值",
      }
    }

    const reqHeaders = {
      "X-Csrf-Token": csrfToken,
      Cookie: sessionCookie,
    }
    // console.log(`headers: ${JSON.stringify(reqHeaders)}`)

    // 获取用户信息
    const userinfoApi = "https://studio.brainpp.com/api/v1/users/0"
    response = await fetch(userinfoApi, {
      method: "GET",
      headers: reqHeaders,
    })

    if (response.status !== 200) {
      return {
        success: false,
        message: "MegStudio 获取用户信息失败",
      }
    }
    const userData: any = await response.json()
    const uid = userData.data.id
    return checkin(uid, csrfToken, sessionCookie)
  }

  // failed. retry 5 times
  let index = 0
  let done = false
  let msg = ""
  while (true) {
    const resp = await login()
    let { success, message } = resp
    done = success
    msg = message
    if (done || index >= 5) {
      break
    } else {
      index = index + 1
    }
  }

  if (!done) {
    console.error(msg)
  }

  return done
}

export default megstudio
