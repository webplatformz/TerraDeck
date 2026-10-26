import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { APP_VERSION } from '../src/data/releases.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const domains = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref']

test('Android release version matches the central fixed release and keeps its upload counter', () => {
  const releaseMatch = read('src/data/releases.ts').match(/major:\s*(\d+),\s*date:\s*'(\d{4})-(\d{2})-(\d{2})'/)
  assert.ok(releaseMatch, 'The Gradle release reader must recognize the current entry')
  assert.equal(`${releaseMatch[1]}.${releaseMatch[2]}${releaseMatch[3]}${releaseMatch[4]}`, APP_VERSION.slice(1))
  const gradle = read('android/app/build.gradle')
  assert.match(gradle, /versionName appVersionName/)
  assert.match(gradle, /versionCode 2\b/)
  assert.match(gradle, /applicationId "com\.webplatformz\.terradeck"/)
})

test('Android excludes local game data from legacy, cloud and device-transfer backups', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml')
  assert.match(manifest, /android:allowBackup="false"/)
  assert.match(manifest, /android:fullBackupContent="@xml\/backup_rules"/)
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/)
  const legacy = read('android/app/src/main/res/xml/backup_rules.xml')
  const modern = read('android/app/src/main/res/xml/data_extraction_rules.xml')
  for (const section of [legacy, modern.match(/<cloud-backup>([\s\S]*?)<\/cloud-backup>/)?.[1], modern.match(/<device-transfer>([\s\S]*?)<\/device-transfer>/)?.[1]]) {
    assert.ok(section)
    for (const domain of domains) assert.ok(section.includes(`<exclude domain="${domain}" path="." />`), domain)
  }
})
