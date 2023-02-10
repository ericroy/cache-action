import * as fs from 'fs'
import * as path from 'path'

export function remove(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    return false
  }
  return true
}

export function join(part: string, ...parts: string[]): string {
  return path.join(part, ...parts).replace(/\\/g, '/')
}
