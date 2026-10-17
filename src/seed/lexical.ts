type Block = string | { h2: string } | { ul: string[] }

const text = (t: string) => ({ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 })

/** Construye un documento Lexical simple (párrafos, títulos y listas) para contenido de ejemplo. */
export const lexical = (blocks: Block[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: blocks.map((b) => {
      if (typeof b === 'string') {
        return { type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [text(b)] }
      }
      if ('h2' in b) {
        return { type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr', children: [text(b.h2)] }
      }
      return {
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: b.ul.map((item, i) => ({ type: 'listitem', value: i + 1, format: '', indent: 0, version: 1, direction: 'ltr', children: [text(item)] })),
      }
    }),
  },
})
