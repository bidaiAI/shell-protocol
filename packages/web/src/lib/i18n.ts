import { ref } from 'vue'

type Lang = 'en' | 'zh'

const _lang = ref<Lang>(
  (localStorage.getItem('shell-lang') as Lang) || 'en',
)

export function useLang() {
  function setLang(l: Lang) {
    _lang.value = l
    localStorage.setItem('shell-lang', l)
  }
  return { lang: _lang, setLang }
}
