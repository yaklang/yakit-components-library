export const strokeWidths = (svg: string) => [...svg.matchAll(/\bstroke-width="([^"]+)"/g)].map((match) => match[1])

export const shapeStrokeWidths = (markup: string) => strokeWidths(markup.replace(/^<span[^>]*><svg[^>]*>/, ''))
