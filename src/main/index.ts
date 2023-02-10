import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as os from 'os'
import * as path from 'path'
import {remove} from '../common/remove'

async function main(): Promise<void> {
  try {
    const inputKey = core.getInput('key')
    const inputPath = core.getInput('path')
    const inputRestoreKeys = core
      .getInput('restore-keys')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
    const inputS3BucketName = core.getInput('s3-bucket-name')
    const inputS3KeyPrefix = core.getInput('s3-key-prefix')
    const inputCompression = core.getInput('compression')

    const uid = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_NUMBER}-${process.env.GITHUB_RUN_ATTEMPT}`
    const tempDir = process.env.RUNNER_TEMP || os.tmpdir()
    const archiveFile = path.join(tempDir, `cache-${uid}`).replace(/\\/g, '/')

    const keys = inputRestoreKeys
    if (keys.length === 0 || keys[0] !== inputKey) {
      keys.unshift(inputKey)
    }

    for (const key of keys) {
      const objectKey = path.join(inputS3KeyPrefix, key).replace(/\\/g, '/')
      const sourceURI = `s3://${inputS3BucketName}/${objectKey}`

      core.debug(`Fetching: ${sourceURI}`)

      let exitCode = await exec.exec('aws', [
        's3',
        'cp',
        sourceURI,
        archiveFile
      ])
      if (exitCode !== 0) {
        core.debug('-- Cache miss')
        continue
      }

      core.debug('-- Cache hit')
      core.debug(`Extracting to: ${inputPath}`)

      exitCode = await exec.exec('tar', [
        '-C',
        inputPath,
        `--${inputCompression}`,
        '-xvf',
        archiveFile
      ])
      if (exitCode !== 0) {
        core.debug(`-- Extraction failed!`)
        remove(archiveFile)
        continue
      }

      core.debug('Extraction complete')
      remove(archiveFile)
      core.setOutput('cache-hit', true)
      return
    }

    core.debug('No cache entry found')
    core.setOutput('cache-hit', false)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
