const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');

test('viewing a preview saves it without spending credits; unlock intent resumes after signup', async () => {
  const originalFetch = global.fetch, originalStorage = global.localStorage;
  try {
    for (const checkoutRequested of [false, true]) {
      const effects = [], actions = [];
      global.localStorage = { getItem: () => null };
      global.fetch = async (_url, options) => {
        const action = JSON.parse(options.body).action; actions.push(action);
        return Response.json({}, { status: action === 'claim' ? 200 : 402 });
      };
      const { ToolResult } = loadTs('apps/web/app/tools/result/[id]/tool-result.tsx', {
        react: {
          useState: initial => [initial, () => {}], useRef: initial => ({current:initial}),
          useCallback: callback => callback, useEffect: callback => effects.push(callback),
          useSyncExternalStore: (_subscribe, _snapshot, serverSnapshot) => serverSnapshot(),
        },
        'posthog-js': { capture: () => {} },
        'next/link': () => null,
        '@/components/purchase-button': { PurchaseButton: () => null },
      });
      ToolResult({ id:'a'.repeat(40), tool:{slug:'test', name:'Test', resultLabels:['One','Two']}, potentialScore:7, signedIn:true, initialReport:null, checkoutRequested });
      effects.forEach(effect => effect());
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(actions, checkoutRequested ? ['claim','unlock'] : ['claim']);
    }
  } finally { global.fetch = originalFetch; if (originalStorage === undefined) delete global.localStorage; else global.localStorage = originalStorage; }
});
