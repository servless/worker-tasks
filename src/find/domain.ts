import notify from "../notify"

// find domains
const domain = async (env: any) => {
  const findomain = await env.data.get("domains")
  if (!findomain) {
    return false
  }

  const domains = findomain.split(";")
  console.log(domains)
  if (domains.length === 0) {
    return false
  }

  const message: string[] = []
  let sound = "" // minuet.caf
  for (const domainName of domains) {
    const [msg, available] = await task(domainName)
    message.push(msg + "\n")
    // 若有一个域名可注册，均播放铃声
    if (available) {
      sound = "bell.caf"
    }
  }

  await notify(env, "「Find Domain」\n" + message.join(""), { sound: sound })
  return true
}

const task = async (domainName: string) => {
  const headers = {
    accept: "application/json, text/javascript, */*; q=0.01",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    dnt: "1",
    pragma: "no-cache",
    "sec-ch-ua":
      '" Not A;Brand";v="99", "Chromium";v="96", "Microsoft Edge";v="96"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.0.0 Safari/537.36 Edg/30.0.1599.101",
    "x-requested-with": "XMLHttpRequest",
  }

  const ispUrl = "https://www.west.xyz"
  const reqUrl = `${ispUrl}/web/whois/whoisinfo?domain=${domainName}&server=&refresh=1`

  let available = false
  let regdate = ""
  let expdate = ""
  let status = ""

  try {
    const response = await fetch(reqUrl, { headers })
    if (response.status !== 200) {
      throw new Error(`status code ${response.status}`)
    }

    const resp: any = await response.json()
    if (resp.code === 200 || resp.code === 100) {
      available = resp.regdate === ""
      status = resp.status
      if (!available) {
        regdate = resp.regdate
        expdate = resp.expdate
      }
    } else {
      throw new Error(`resp code ${resp.code}`)
    }
  } catch (e) {
    console.error(`Error: find domain: ${domainName}, err:${e}`)
    regdate = ""
    expdate = ""
    available = false
  }

  return [
    `${domainName} ${
      available ? "可" : "不可"
    }注册，过期时间（${expdate}），状态（${status}）`,
    available,
  ]
  // return available
}

export default domain
