import notify from "../notify"

const find = async domain => {
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
  const reqUrl = `${ispUrl}/web/whois/whoisinfo?domain=${domain}&server=&refresh=0`

  let available = false
  let regdate = ""
  let expdate = ""
  let err = 1

  try {
    const response = await fetch(reqUrl, { headers })
    if (!response.ok) {
      throw new Error(`status code ${response.status}`)
    }

    const resp: any = await response.json()

    if (resp.code === 200 || resp.code === 100) {
      available = resp.regdate === ""
      if (!available) {
        regdate = resp.regdate
        expdate = resp.expdate
      }
      // 返回码
      err = 0
    } else {
      throw new Error(`resp code ${resp.code}`)
    }
  } catch (e) {
    console.log(`Error: find domain: ${domain}, err:${e}`)
    available = false
    regdate = ""
    expdate = ""
    err = 1
  }

  return `domain: ${domain}, available: ${available}`
  // return available
}

// domain find
const domain = async env => {
  const findomain = await env.cookies.get("domains")
  if (!findomain) {
    return false
  }

  const domains = findomain.split(",")
  console.log(domains)
  if (domains.length === 0) {
    return false
  }

  const info: string[] = []
  for (const domain of domains) {
    info.push((await find(domain)) + "\n")
    // info.push(`domain: ${domain}, available: ${await find(domain)}\n`)
  }

  await notify(env, "Domains: \n" + info.join(""))
  return true
}

export default domain
