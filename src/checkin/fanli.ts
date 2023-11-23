import notify from "../notify"

// fanli check in
const fanli = async env => {
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

  try {
    const resp = await fetch(checkInUrl, { headers })
    const json: any = await resp.json()
    console.log(json)
    if (json.status === 1) {
      await notify(env, "Fanli Check-in Successful")
      return true
    }
    throw new Error("Sesson Expired")
  } catch (error) {
    console.error(error)
    await notify(env, "Fanli Check-in Failed")
    return false
  }
}

export default fanli
