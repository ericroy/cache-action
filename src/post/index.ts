import * as core from '@actions/core'
import {Cache} from '../cache'

async function post(): Promise<void> {
  try {
    const c = new Cache()
    await c.post()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

post()
