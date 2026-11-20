/* global document */
;(() => {
  'use strict'
  const { icons, brands, palettes } = JSON.parse(document.getElementById('catalog-data').textContent)
  const $ = (id) => document.getElementById(id)
  const pageSize = 60
  let page = 1
  const byNodeId = new Map()
  for (const icon of icons) {
    if (!byNodeId.has(icon.nodeId)) byNodeId.set(icon.nodeId, [])
    byNodeId.get(icon.nodeId).push(icon)
  }
  for (const [value, { name }] of Object.entries(brands)) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = name
    $('brand').append(option)
  }
  function applyTheme() {
    const brand = $('brand').value
    const theme = $('theme').value
    document.documentElement.dataset.brand = brand
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    for (const [key, value] of Object.entries(palettes[brand][theme]))
      document.documentElement.style.setProperty(key, value)
  }
  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value)
      $('copy-status').textContent = '已复制'
    } catch {
      // file:// clipboard permissions differ by browser. Select text as a fallback.
      const input = document.createElement('textarea')
      input.value = value
      input.setAttribute('aria-label', '待复制内容')
      document.body.append(input)
      input.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } catch {
        /* Manual copy remains available. */
      }
      input.remove()
      $('copy-status').textContent = copied ? '已复制' : '请选中文字手动复制'
    }
  }
  function card(icon) {
    const article = document.createElement('article')
    article.className = 'card'
    article.dataset.export = icon.exportName
    article.dataset.family = icon.family
    const preview = document.createElement('div')
    preview.className = 'preview'
    preview.setAttribute('aria-hidden', 'true')
    if (icon.defaultColor) preview.style.color = icon.defaultColor
    preview.innerHTML = icon.svg
    const metadata = document.createElement('div')
    metadata.className = 'metadata'
    for (const [label, value, copy] of [
      ['Figma 名称：', icon.figmaName ?? '未提供', false],
      ['组件名称：', icon.exportName, true],
      ['Figma nodeId：', icon.nodeId, true],
    ]) {
      const line = document.createElement(copy ? 'button' : 'p')
      line.title = value
      if (copy) {
        line.type = 'button'
        line.className = 'copy'
        line.setAttribute('aria-label', `复制${label}${value}`)
        line.addEventListener('click', () => copyText(value))
      }
      const caption = document.createElement('span')
      caption.textContent = label
      line.append(caption, document.createTextNode(value))
      metadata.append(line)
    }
    article.append(preview, metadata)
    return article
  }
  function render() {
    const query = $('node-id')
      .value.trim()
      .replace(/^(\d+)-(\d+)$/, '$1:$2')
    let matches = query ? (byNodeId.get(query) ?? []) : icons
    if ($('family').value !== 'all') matches = matches.filter((icon) => icon.family === $('family').value)
    const pages = Math.ceil(matches.length / pageSize)
    page = Math.max(1, Math.min(page, pages))
    const start = (page - 1) * pageSize
    $('icons').replaceChildren(...matches.slice(start, start + pageSize).map(card))
    $('result').textContent = matches.length
      ? `共 ${matches.length} 个图标 · 显示 ${start + 1}–${Math.min(start + pageSize, matches.length)}`
      : '0 个匹配图标'
    $('empty').hidden = matches.length !== 0
    $('page').textContent = `第 ${pages ? page : 0} / ${pages} 页`
    $('previous').disabled = page <= 1
    $('next').disabled = page >= pages
  }
  $('node-id').addEventListener('input', () => {
    page = 1
    render()
  })
  $('family').addEventListener('change', () => {
    page = 1
    render()
  })
  $('clear').addEventListener('click', () => {
    $('node-id').value = ''
    page = 1
    render()
    $('node-id').focus()
  })
  $('previous').addEventListener('click', () => {
    page--
    render()
  })
  $('next').addEventListener('click', () => {
    page++
    render()
  })
  $('brand').addEventListener('change', applyTheme)
  $('theme').addEventListener('change', applyTheme)
  applyTheme()
  render()
})()
