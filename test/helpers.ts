import * as path from 'path'
import * as fs from 'fs'
export default class TestHelpers {
  public static loadSample(file: string) {
    const location = path.join(__dirname, 'samples/', `${file}.json`)
    return JSON.parse(fs.readFileSync(location).toString())
  }
}
