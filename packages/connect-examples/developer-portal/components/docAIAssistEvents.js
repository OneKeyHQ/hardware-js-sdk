export const DOCS_AI_OPEN_EVENT = 'onekey-docs-ai:open';

export const DOCS_AI_TAB = {
  SEARCH: 'search',
  ASK: 'ask',
};

export const emitDocsAIOpen = mode => {
  if (typeof window === 'undefined') return;

  const nextMode = mode === DOCS_AI_TAB.ASK ? DOCS_AI_TAB.ASK : DOCS_AI_TAB.SEARCH;
  window.dispatchEvent(
    new CustomEvent(DOCS_AI_OPEN_EVENT, {
      detail: {
        mode: nextMode,
      },
    })
  );
};
