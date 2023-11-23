import notify from "../notify"

// megstudio check in
const megstudio = async env => {
  const username = await env.cookies.get("megstudio_username")
  if (!username) {
    return false
  }
  const password = await env.cookies.get("megstudio_password")
  if (!password) {
    return false
  }
  const ocr_url = await env.cookies.get("ocr_url")
  if (!ocr_url) {
    return false
  }

  const b64decode = base64String => {
    const binaryString = atob(base64String)
    const length = binaryString.length
    const uint8Array = new Uint8Array(length)

    for (let i = 0; i < length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }

    return uint8Array
  }

  const checkin = async (uid, token, cookie) => {
    const checkin_api = `https://studio.brainpp.com/api/v1/users/${uid}/point-actions/checkin`
    const headers = {
      Referer: "https://studio.brainpp.com/",
      "X-Csrf-Token": token,
      Cookie: cookie,
    }

    const response = await fetch(checkin_api, {
      method: "POST",
      headers: headers,
    })

    console.log(response.status)
    if (response.status === 200 || response.status === 403) {
      return true
    }
    return false
  }

  const login = async () => {
    const login_url =
      "https://studio.brainpp.com/api/authv1/login?redirectUrl=https://studio.brainpp.com/"
    const login_response = await fetch(login_url)
    if (login_response.status !== 200) {
      return false
    }

    const parsed_url = new URL(login_response.url)
    const query_params = parsed_url.searchParams
    const login_challenge_value = query_params.get("login_challenge") || ""
    if (!login_challenge_value) {
      return false
    }

    const current_time = String(Math.floor(Date.now()))
    const captcha_url = `https://account.megvii.com/api/v1/captcha?endpoint=login&_t=${current_time}`

    const captcha_response = await fetch(captcha_url)
    const captcha_data: any = await captcha_response.json()
    if (captcha_data.error_code !== 0) {
      return false
    }

    const biz_id = captcha_data.data.biz_id
    const image_base64 = captcha_data.data.image
    const image_data = b64decode(image_base64)

    // const imageBuffer = Buffer.from(image_data, 'base64');
    const formData = new FormData()
    formData.append("image", new Blob([image_data]), "captcha.png")

    const captcha_response_code = await fetch(`${ocr_url}/ocr/file`, {
      method: "POST",
      body: formData,
    })

    const captcha = await captcha_response_code.text()
    // console.log(`captcha: ${captcha}`)
    if (captcha == "" || captcha.length != 4) {
      return false
    }

    const login_api = "https://account.megvii.com/api/v1/login"
    const headers = {
      Referer: "https://studio.brainpp.com/",
      "Content-Type": "application/json",
    }

    const login_data = {
      username: username,
      password: password,
      code: captcha,
      biz_id: biz_id,
      login_challenge: login_challenge_value,
    }

    const login_data_response = await fetch(login_api, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(login_data),
    })
    if (login_data_response.status !== 200) {
      return false
    }

    const login_resp: any = await login_data_response.json()
    if (login_resp.error_code !== 0) {
      return false
    }
    if (login_resp.data.code !== 0) {
      return false
    }
    const redirect_url = login_resp.data.redirect
    let session_cookie = login_data_response.headers.get("Set-Cookie") || ""
    // allow_redirects 设置为 False，避免重定向请求
    let response = await fetch(redirect_url, {
      method: "GET",
      headers: {
        Cookie: session_cookie,
      },
      redirect: "manual",
    })
    session_cookie = response.headers.get("Set-Cookie") || ""
    // console.log(`session_cookie: ${session_cookie}`)

    // 处理多级 302 跳转
    while (response.status === 302) {
      // 获取当前响应的 URL
      const current_url = response.headers.get("Location") || ""
      if (!current_url) {
        break
      }
      // console.log(current_url);

      // 发送下一次跳转请求，继续禁用自动跟踪重定向
      response = await fetch(current_url, {
        method: "GET",
        headers: {
          Cookie: session_cookie,
        },
        redirect: "manual",
      })
      const current_cookie = response.headers.get("Set-Cookie")
      if (current_cookie) {
        session_cookie = current_cookie
      }
    }

    const resp_text = await response.text()
    // 从网页源码中获取 X-CSRF-Token
    const csrf_token_match = /<meta name=X-CSRF-Token content="([^"]+)"/.exec(
      resp_text
    )
    if (!csrf_token_match) {
      return false
    }
    const csrf_token = csrf_token_match[1]
    if (!csrf_token) {
      return false
    }

    const req_headers = {
      "X-Csrf-Token": csrf_token,
      Cookie: session_cookie,
    }
    // console.log(`headers: ${JSON.stringify(req_headers)}`)

    // 获取用户信息
    const userinfo_api = "https://studio.brainpp.com/api/v1/users/0"
    response = await fetch(userinfo_api, {
      method: "GET",
      headers: req_headers,
    })

    if (response.status !== 200) {
      return false
    }
    const user_data: any = await response.json()
    const uid = user_data.data.id
    return checkin(uid, csrf_token, session_cookie)
  }

  let index = 0
  let checked = false
  while (true) {
    checked = await login()
    if (checked || index >= 5) {
      break
    } else {
      index = index + 1
    }
  }

  try {
    if (checked) {
      await notify(env, "MegStudio Check-in Successful")
      return true
    }
    throw new Error("Sesson Expired")
  } catch (error) {
    console.error(error)
    await notify(env, "MegStudio Check-in Failed")
    return false
  }
}

export default megstudio
