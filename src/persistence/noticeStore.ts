export const NOTICE_STORAGE_KEY = 'terradeck:project-notice'
export const NOTICE_VERSION = '1'

export const noticeStore = {
  acknowledged(storage?: Storage): boolean {
    try {
      return (storage ?? window.localStorage).getItem(NOTICE_STORAGE_KEY) === NOTICE_VERSION
    } catch (error) {
      console.warn('TerraDeck: could not read project notice preference', error)
      return false
    }
  },
  acknowledge(storage?: Storage): boolean {
    try {
      (storage ?? window.localStorage).setItem(NOTICE_STORAGE_KEY, NOTICE_VERSION)
      return true
    } catch (error) {
      console.warn('TerraDeck: project notice acknowledgement lasts for this session only', error)
      return false
    }
  },
}
