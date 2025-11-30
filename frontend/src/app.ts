declare const ethers: any;

type AbiEntry = any;

const CONTRACT_ARTIFACTS: Record<string, string> = {
  EmployeeAssignment: './contracts/Owner/employe_assignment.sol/EmployeeAssignment.json',
  System_wallet: './contracts/system/Wallet.sol/System_wallet.json',
  TrustlessTeamProtocol: './contracts/User/TrustlessTeamProtocol.sol/TrustlessTeamProtocol.json'
};

const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const accountSpan = document.getElementById('account') as HTMLElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const contractsRoot = document.getElementById('contracts') as HTMLElement;

let provider: any = null;
let signer: any = null;
let userAddress: string | null = null;

async function connectWallet() {
  if (!(window as any).ethereum) {
    alert('No injected wallet detected (MetaMask). Please install or use a dapp browser.');
    return;
  }
  provider = new (ethers as any).BrowserProvider((window as any).ethereum);
  try {
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    accountSpan.textContent = userAddress;
    connectBtn.textContent = 'Connected';
    connectBtn.disabled = true;
  } catch (e: any) {
    console.error(e);
    alert('Failed to connect wallet: ' + (e.message || e));
  }
}

connectBtn.addEventListener('click', () => void connectWallet());

async function fetchArtifact(path: string): Promise<any | null> {
  // Try primary path first. If not found, attempt fallback locations:
  // 1) /contracts/<basename> (this will work when frontend is served from ./dist and we copy JSON there)
  // 2) /frontend/src/contracts/<basename> (if serving repo root and user put ABIs there)
  const attempts = [path];
  const base = path.split('/').pop();
  if (base) {
    attempts.push(`/contracts/${base}`);
    attempts.push(`/frontend/src/contracts/${base}`);
  }

  for (const p of attempts) {
    try {
      const res = await fetch(p);
      if (!res.ok) {
        // proceed to next
        continue;
      }
      return await res.json();
    } catch (e) {
      // try next
      continue;
    }
  }
  console.warn('Could not fetch artifact at any known location for', path);
  return null;
}

function clearContracts() {
  contractsRoot.innerHTML = '';
}

function pretty(value: any): string {
  try {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, replacer, 2);
    return String(value);
  } catch (e) {
    return String(value);
  }
}

function replacer(_k: string, val: any) {
  if (typeof val === 'bigint') return val.toString();
  if (val && typeof val === 'object' && '_isBigNumber' in val) return val.toString();
  return val;
}

function parseInput(v: string): any {
  if (v === undefined || v === null) return v;
  v = v.trim();
  if (v === '') return '';
  if (/^0x[0-9a-fA-F]+$/.test(v)) return v;
  // try JSON for arrays/objects
  if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
    try { return JSON.parse(v); } catch { /* fallthrough */ }
  }
  // number?
  if (!isNaN(Number(v))) return v;
  return v;
}

// Create an input element and parser for a given solidity type
function createInputForType(type: string, name?: string): { el: HTMLElement; parser: (v: any) => any } {
  // basic mappings
  if (type.startsWith('uint') || type.startsWith('int')) {
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = name ? `${name} (${type})` : type;
    return { el: input, parser: (v: any) => {
      if (v === '' || v === null) return 0;
      // return string to let ethers handle big numbers
      return String(v);
    }};
  }
  if (type === 'address') {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = name ? `${name} (address)` : 'address';
    return { el: input, parser: (v: any) => v };
  }
  if (type === 'bool') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    return { el: input, parser: (v: any) => !!v && v !== 'false' };
  }
  if (type === 'string' || type === 'bytes' || type.startsWith('bytes')) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = name ? `${name} (${type})` : type;
    return { el: input, parser: (v: any) => v };
  }
  // arrays or tuples: use textarea JSON input
  if (type.endsWith(']') || type.startsWith('tuple')) {
    const ta = document.createElement('textarea');
    ta.placeholder = name ? `${name} (JSON array/object)` : 'JSON array/object';
    ta.rows = 2;
    return { el: ta, parser: (v: any) => {
      try { return JSON.parse(v); } catch { return v; }
    }};
  }
  // fallback
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = name ? `${name} (${type})` : type;
  return { el: input, parser: (v: any) => v };
}

function renderFunction(contractName: string, contractInstance: any, abiEntry: AbiEntry) {
  const row = document.createElement('div');
  row.className = 'fn-row';

  const meta = document.createElement('div');
  meta.className = 'fn-meta';
  const sig = `${abiEntry.name}(${(abiEntry.inputs || []).map((i: any) => i.type).join(',')})`;
  meta.innerHTML = `<strong>${abiEntry.name}</strong> <div class="small">${sig} — ${abiEntry.stateMutability}</div>`;

  const controls = document.createElement('div');
  controls.className = 'fn-controls';

  const inputsWrap = document.createElement('div');
  inputsWrap.className = 'fn-inputs';

  const parsers: Array<(v: any) => any> = [];
  (abiEntry.inputs || []).forEach((inp: any) => {
    const { el, parser } = createInputForType(inp.type, inp.name);
    parsers.push(parser);
    inputsWrap.appendChild(el);
  });

  let valueInput: HTMLInputElement | null = null;
  if (abiEntry.stateMutability === 'payable') {
    valueInput = document.createElement('input');
    valueInput.placeholder = 'ETH value (e.g. 0.01)';
    inputsWrap.appendChild(valueInput);
  }

  const actionBtn = document.createElement('button');
  actionBtn.textContent = (abiEntry.stateMutability === 'view' || abiEntry.stateMutability === 'pure') ? 'Call' : 'Send Tx';

  const resultEl = document.createElement('div');
  resultEl.className = 'result';
  resultEl.textContent = '';

  actionBtn.addEventListener('click', async () => {
    resultEl.textContent = 'Working...';
    try {
      // collect values from inputsWrap children using parsers
      const args: any[] = [];
      let parserIndex = 0;
      for (const ch of Array.from(inputsWrap.children)) {
        // skip valueInput element
        if (valueInput && ch === valueInput) continue;
        const parser = parsers[parserIndex++];
        const val = (ch as HTMLInputElement).value;
        const parsed = parser(val);
        args.push(parsed);
      }

      if (abiEntry.stateMutability === 'view' || abiEntry.stateMutability === 'pure') {
        const res = await contractInstance[abiEntry.name](...args);
        resultEl.textContent = pretty(res);
      } else {
        if (!signer) {
          alert('Please connect wallet to send transactions');
          resultEl.textContent = 'Not connected';
          return;
        }
        const writeContract = contractInstance.connect ? contractInstance.connect(signer) : contractInstance;
        const overrides: any = {};
        if (valueInput && valueInput.value) {
          overrides.value = (ethers as any).parseEther(valueInput.value || '0');
        }
        const tx = await writeContract[abiEntry.name](...args, overrides);
        resultEl.textContent = 'Tx sent: ' + (tx.hash || tx.transactionHash || JSON.stringify(tx));
        try { await tx.wait?.(); resultEl.textContent += ' — confirmed'; } catch { /* ignore */ }
      }
    } catch (e: any) {
      console.error(e);
      resultEl.textContent = 'Error: ' + (e?.message || String(e));
    }
  });

  controls.appendChild(inputsWrap);
  controls.appendChild(actionBtn);
  controls.appendChild(resultEl);

  row.appendChild(meta);
  row.appendChild(controls);
  return row;
}

async function loadAndRender() {
  clearContracts();
  const addrEmp = (document.getElementById('addr_employee') as HTMLInputElement).value.trim();
  const addrWal = (document.getElementById('addr_wallet') as HTMLInputElement).value.trim();
  const addrProt = (document.getElementById('addr_protocol') as HTMLInputElement).value.trim();

  const pairs = [
    { name: 'EmployeeAssignment', addr: addrEmp, path: CONTRACT_ARTIFACTS.EmployeeAssignment },
    { name: 'System_wallet', addr: addrWal, path: CONTRACT_ARTIFACTS.System_wallet },
    { name: 'TrustlessTeamProtocol', addr: addrProt, path: CONTRACT_ARTIFACTS.TrustlessTeamProtocol }
  ];

  for (const p of pairs) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    const title = document.createElement('h3');
    title.textContent = p.name + (p.addr ? (' — ' + p.addr) : '');
    card.appendChild(title);

    const artifact = await fetchArtifact(p.path);
    if (!artifact) {
      const msg = document.createElement('div');
      msg.textContent = 'Could not load ABI at ' + p.path;
      msg.className = 'small';
      card.appendChild(msg);
      contractsRoot.appendChild(card);
      continue;
    }

    const abi = artifact.abi || [];
    const usedAddr = p.addr || '0x0000000000000000000000000000000000000000';
    const cInstance = new (ethers as any).Contract(usedAddr, abi, provider || (ethers as any).VoidSigner);

    const fnList = abi.filter((a: any) => a.type === 'function');
    if (fnList.length === 0) {
      const nofn = document.createElement('div'); nofn.textContent = 'No callable functions in ABI.'; card.appendChild(nofn);
    }
    fnList.forEach((fn: AbiEntry) => {
      const fnEl = renderFunction(p.name, cInstance, fn);
      card.appendChild(fnEl);
    });

    contractsRoot.appendChild(card);
  }
}

// Try to auto-load addresses from frontend/src/contracts/addresses.json (or /contracts/addresses.json when served)
async function tryAutoLoadAddresses(){
  const candidates = ['/contracts/addresses.json', '/frontend/src/contracts/addresses.json', '/artifacts/contracts/addresses.json'];
  for(const c of candidates){
    try{
      const res = await fetch(c);
      if(!res.ok) continue;
      const j = await res.json();
      // Expecting keys like EmployeeAssignment, System_wallet, TrustlessTeamProtocol
      if(j.EmployeeAssignment) (document.getElementById('addr_employee') as HTMLInputElement).value = j.EmployeeAssignment;
      if(j.System_wallet) (document.getElementById('addr_wallet') as HTMLInputElement).value = j.System_wallet;
      if(j.TrustlessTeamProtocol) (document.getElementById('addr_protocol') as HTMLInputElement).value = j.TrustlessTeamProtocol;
      console.log('Loaded addresses from', c);
      return;
    }catch(e){
      continue;
    }
  }
}

// attempt auto-load on page load
(async ()=>{ await tryAutoLoadAddresses(); })();

loadBtn.addEventListener('click', () => void loadAndRender());
resetBtn.addEventListener('click', () => { (document.getElementById('addr_employee') as HTMLInputElement).value = ''; (document.getElementById('addr_wallet') as HTMLInputElement).value = ''; (document.getElementById('addr_protocol') as HTMLInputElement).value = ''; clearContracts(); });

// auto-detect accounts
(async () => {
  if ((window as any).ethereum) {
    try {
      provider = new (ethers as any).BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_accounts', []);
      if (accounts && accounts.length > 0) {
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        accountSpan.textContent = userAddress;
        connectBtn.textContent = 'Connected';
        connectBtn.disabled = true;
      }
    } catch (e) { /* ignore */ }
  }
})();
