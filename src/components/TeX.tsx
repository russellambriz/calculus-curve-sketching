import katex from 'katex';
import { useMemo } from 'react';

export function TeX({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(children, { throwOnError: false, displayMode: block }), [children, block]);
  return <span className={block ? 'tex-block' : 'tex'} dangerouslySetInnerHTML={{ __html: html }} />;
}
