import type { GlobalToken } from '../types/token'

import useYakitConfig from './useYakitConfig'

interface NativeTheme {
  mode: 'light' | 'dark'
}

type UseTokenResult = [NativeTheme, GlobalToken, string]

const useToken = (): UseTokenResult => {
  const { mode, token } = useYakitConfig()
  return [{ mode }, token, '']
}
export default useToken
