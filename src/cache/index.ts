import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as os from 'os'
import * as util from '../util'

export class Cache {
  private inputKey = core.getInput('key')
  private inputPath = core.getInput('path')
  private inputRestoreKeys = core.getMultilineInput('restore-keys')
  private inputS3BucketName = core.getInput('s3-bucket-name')
  private inputS3KeyPrefix = core.getInput('s3-key-prefix')
  private inputCompression = core.getInput('compression')

  private tempDir = process.env.RUNNER_TEMP || os.tmpdir()
  private uid = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_NUMBER}-${process.env.GITHUB_RUN_ATTEMPT}`

  private keys: string[]

  constructor() {
    this.keys = [...this.inputRestoreKeys]
    if (this.keys.length === 0 || this.keys[0] !== this.inputKey) {
      this.keys.unshift(this.inputKey)
    }
  }

  async main(): Promise<boolean> {
    for (const key of this.keys) {
      const file = await this.restore(key)
      if (file !== null) {
        const ok = await this.extract(file)
        util.remove(file)
        if (ok) {
          return true
        }
      }
    }
    core.warning(`No cache item found.`)
    return false
  }

  async post(): Promise<void> {
    const file = await this.compress()
    if (file === null) {
      throw new Error('Compression failed')
    }
    if (!(await this.cache(file))) {
      throw new Error('Upload failed')
    }
  }

  async restore(cacheKey: string): Promise<string | null> {
    const objectKey = util.join(this.inputS3KeyPrefix, cacheKey)
    const remoteObject = `s3://${this.inputS3BucketName}/${objectKey}`
    const localFile = util.join(this.tempDir, `cache-${this.uid}`)
    core.debug(`Attempting to restore cache "${cacheKey}" from remote: ${remoteObject}`)
    try {
      const code = await exec.exec('aws', ['s3', 'cp', remoteObject, localFile])
      if (code !== 0) {
        core.debug(`Not found, aws exited with status: ${code}`)
        return null
      }
      core.info(`Restored cache key: ${cacheKey}`)
      return localFile
    } catch (err) {
      core.error(`Failed: ${err}`)
    }
    return null
  }

  async extract(localFile: string): Promise<boolean> {
    core.debug(`Extracting "${localFile}" to: ${this.inputPath}`)
    try {
      io.mkdirP(this.inputPath)
    } catch (err) {
      core.error(`Failed to create directory: ${this.inputPath}`)
      return false
    }
    const code = await exec.exec('tar', ['-C', this.inputPath, `--${this.inputCompression}`, '-xvf', localFile])
    if (code !== 0) {
      core.error(`Extraction failed, tar exited with status: ${code}`)
      return false
    }
    core.debug('Extraction complete')
    return true
  }

  async compress(): Promise<string | null> {
    const localFile = util.join(this.tempDir, `cache-${this.uid}`)
    core.debug(`Compressing "${this.inputPath}" to: ${localFile}`)
    try {
      io.mkdirP(this.inputPath)
    } catch (err) {
      core.error(`Failed to create directory: ${this.inputPath}`)
      return null
    }
    const code = await exec.exec('tar', ['-C', this.inputPath, `--${this.inputCompression}`, '-cvf', localFile, './*'])
    if (code !== 0) {
      core.error(`Compression failed, tar exited with status: ${code}`)
      return null
    }
    core.debug('Compression complete')
    return localFile
  }

  async cache(localFile: string): Promise<boolean> {
    const objectKey = util.join(this.inputS3KeyPrefix, this.inputKey)
    const remoteObject = `s3://${this.inputS3BucketName}/${objectKey}`
    core.debug(`Uploading "${localFile}" to: ${remoteObject}`)
    const code = await exec.exec('aws', ['s3', 'cp', localFile, remoteObject])
    if (code !== 0) {
      core.error(`Upload failed, aws exited with status: ${code}`)
      return false
    }
    core.debug('Upload complete')
    return true
  }
}
