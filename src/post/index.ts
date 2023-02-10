import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {remove} from '../common/remove'

async function post(): Promise<void> {
  try {
    const inputKey = core.getInput('key')
    const inputPath = core.getInput('path')
    const inputS3BucketName = core.getInput('s3-bucket-name')
    const inputS3KeyPrefix = core.getInput('s3-key-prefix')
    const inputCompression = core.getInput('compression')

    const uid = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_NUMBER}-${process.env.GITHUB_RUN_ATTEMPT}`
    const tempDir = process.env.RUNNER_TEMP || os.tmpdir()
    const archiveFile = path.join(tempDir, `cache-${uid}`).replace(/\\/g, '/')

    const objectKey = path.join(inputS3KeyPrefix, inputKey).replace(/\\/g, '/')
    const destinationURI = `s3://${inputS3BucketName}/${objectKey}`

    if (!fs.existsSync(inputPath)) {
      core.debug(`Input path does not exist: ${inputPath}`)
      core.debug('Nothing to do')
      return
    } else if (!fs.lstatSync(inputPath).isDirectory()) {
      core.debug(`WARN: Input path is not a directory: ${inputPath}`)
      core.debug('Nothing to do')
      return
    }

    core.debug(`Compressing: ${inputPath}`)

    let exitCode = await exec.exec('tar', [
      '-C',
      inputPath,
      `--${inputCompression}`,
      '-cvf',
      archiveFile,
      '*'
    ])
    if (exitCode !== 0) {
      core.debug(`-- Compression failed!`)
      remove(archiveFile)
      throw new Error(`tar failed with exit code: ${exitCode}`)
    }

    core.debug('Compression complete')
    core.debug(`Uploading to: ${destinationURI}`)

    exitCode = await exec.exec('aws', ['s3', 'cp', archiveFile, destinationURI])
    if (exitCode !== 0) {
      core.debug(`-- Upload failed!`)
      remove(archiveFile)
      throw new Error(`aws s3 command failed with exit code: ${exitCode}`)
    }

    core.debug('Upload complete')
    remove(archiveFile)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

post()
