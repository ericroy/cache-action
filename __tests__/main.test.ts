import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

// test('throws invalid number', async () => {
//   const input = parseInt('foo', 10)
//   await expect(wait(input)).rejects.toThrow('milliseconds not a number')
// })

// test('wait 500 ms', async () => {
//   const start = new Date()
//   await wait(500)
//   const end = new Date()
//   var delta = Math.abs(end.getTime() - start.getTime())
//   expect(delta).toBeGreaterThan(450)
// })

// shows how the runner will run a javascript action with env / stdout protocol
test('test main runs', () => {
  // process.env['INPUT_MILLISECONDS'] = '500'
  const index = path.join(__dirname, '..', 'lib', 'main', 'index.js')
  console.log(cp.execFileSync(process.execPath, [index], {
    env: process.env
  }).toString())
})

test('test post runs', () => {
  // process.env['INPUT_MILLISECONDS'] = '500'
  const index = path.join(__dirname, '..', 'lib', 'post', 'index.js')
  console.log(cp.execFileSync(process.execPath, [index], {
    env: process.env
  }).toString())
})
