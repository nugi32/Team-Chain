// Shared helpers: event logger, error parser, requireSigner

// Simple UI log panel
(function () {
  const style = document.createElement('style');
  style.textContent = `
    #event-log { position: fixed; right: 12px; bottom: 12px; width: 340px; max-height: 40vh; overflow:auto; z-index:9999; background: rgba(0,0,0,0.85); color: #fff; font-size:12px; border-radius:8px; padding:8px; }
    #event-log .ev { margin-bottom:6px; padding:6px; border-radius:4px; background: rgba(255,255,255,0.03); }
    #event-log .ev .t { font-weight:700; margin-bottom:4px; display:block }
    #event-log .small { opacity:0.8; font-size:11px }
  `;
  document.head.appendChild(style);

  function createPanel() {
    if (document.getElementById('event-log')) return;
    const panel = document.createElement('div');
    panel.id = 'event-log';
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Events & Errors</div>';
    document.body.appendChild(panel);
  }

  createPanel();

  window.logEvent = function (kind, title, payload) {
    try {
      createPanel();
      const panel = document.getElementById('event-log');
      const ev = document.createElement('div');
      ev.className = 'ev';
      const t = document.createElement('div');
      t.className = 't';
      t.textContent = `${kind.toUpperCase()}: ${title}`;
      ev.appendChild(t);
      const pre = document.createElement('pre');
      pre.className = 'small';
      try {
        pre.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
      } catch (e) {
        pre.textContent = String(payload);
      }
      ev.appendChild(pre);
      panel.prepend(ev);
    } catch (e) {
      console.log('logEvent error', e);
    }
    // Always also console.log
    console.log('[LOGEVENT]', kind, title, payload);
  };

  window.parseEthersError = function (err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.reason) return err.reason;
    if (err.data && typeof err.data === 'string') return err.data;
    if (err.error?.message) return err.error.message;
    if (err.info?.error?.message) return err.info.error.message;
    if (err.message) return err.message;
    try { return JSON.stringify(err); } catch (e) { return String(err); }
  };

  // requireSigner helper - uses existing window.getConnectedAddress
  window.requireSigner = async function () {
    if (window.currentSigner && window.currentAddress) return { signer: window.currentSigner, address: window.currentAddress };
    try {
      const res = await window.getConnectedAddress();
      if (!res || !res.signer) throw new Error('Wallet not connected');
      return res;
    } catch (err) {
      const msg = window.parseEthersError(err);
      window.logEvent('error', 'requireSigner', msg);
      throw err;
    }
  };

  // track attached event listeners to avoid duplicates
  window._attachedContractEventKeys = window._attachedContractEventKeys || new Set();

  // helper to attach all events from artifact to contract
  window.attachEventsFromArtifact = function (contract, artifact) {
    if (!contract || !artifact?.abi) return;
    const key = `${contract.address}-${artifact.chainId || ''}`;
    if (window._attachedContractEventKeys.has(key)) return;

    artifact.abi.forEach((item) => {
      if (item.type === 'event') {
        const name = item.name;
        try {
          contract.on(name, (...args) => {
            // last arg is event object
            const ev = args[args.length - 1];
            const data = { args: args.slice(0, -1), event: { event: ev?.event, blockNumber: ev?.blockNumber, transactionHash: ev?.transactionHash } };
            window.logEvent('event', `${name} emitted`, data);
          });
        } catch (e) {
          console.warn('attachEventsFromArtifact failed for', name, e);
        }
      }
    });

    window._attachedContractEventKeys.add(key);
  };
})();
