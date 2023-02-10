import * as fs from 'fs'

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
