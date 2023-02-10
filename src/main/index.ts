import * as core from '@actions/core'
import {Cache} from '../cache'

async function main(): Promise<void> {
  try {
    const c = new Cache()
    const hit = await c.main()
    core.setOutput('cache-hit', hit)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
