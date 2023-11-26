import v2ex from "./checkin/v2ex"
import megstudio from "./checkin/megstudio"
import domain from "./find/domain"

export default {
  async scheduled(event, env, ctx) {
    const results = await Promise.allSettled([
      // checkin
      v2ex(env),
      megstudio(env),

      // find
      domain(env),
    ])
    const tasks = ["v2ex", "megstudio", "find-domain"]
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
