// Flattens compressed CSS into ordered `selector path -> declarations` pairs so
// a profile addition can be compared rule by rule instead of file by file.
export function flattenRules(css) {
  const rules = []
  let index = 0

  function block(path) {
    let buffer = ''
    while (index < css.length) {
      const character = css[index]
      if (character === '}') {
        index++
        if (buffer.trim()) rules.push([path.join('|'), buffer.trim()])
        return
      }
      if (character === '{') {
        index++
        const prelude = buffer.trim()
        buffer = ''
        block([...path, prelude])
        continue
      }
      buffer += character
      index++
    }
    if (buffer.trim()) rules.push([path.join('|'), buffer.trim()])
  }

  block([])
  return rules
}

export function ruleKeys(css) {
  return flattenRules(css).map(([path, declarations]) => `${path}{${declarations}}`)
}
