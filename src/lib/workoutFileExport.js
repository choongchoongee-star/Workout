import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { downloadTextFile } from './exportUtils'

export async function exportWorkoutFile(contents, filename) {
  if (!Capacitor.isNativePlatform()) {
    downloadTextFile(contents, filename, 'text/markdown;charset=utf-8')
    return
  }

  const result = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  await Share.share({
    title: 'Workout backup',
    dialogTitle: 'Save or share workout backup',
    files: [result.uri],
  })
}
