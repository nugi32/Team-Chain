(function(){
  // Simple frontend using ethers v6 (UMD global `ethers`).
  // Expects to be served from repo root so it can fetch artifact JSON from /artifacts/.. paths.

  const CONTRACT_ARTIFACTS = {
    EmployeeAssignment: '/artifacts/contracts/Owner/employe_assignment.sol/EmployeeAssignment.json',
    System_wallet: '/artifacts/contracts/system/Wallet.sol/System_wallet.json',
    TrustlessTeamProtocol: '/artifacts/contracts/User/TrustlessTeamProtocol.sol/TrustlessTeamProtocol.json'
  };

  const connectBtn = document.getElementById('connectBtn');
  const accountSpan = document.getElementById('account');
  const loadBtn = document.getElementById('loadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const contractsRoot = document.getElementById('contracts');

  let provider = null;
  let signer = null;
  let userAddress = null;
  let loadedArtifacts = {};

  async function connectWallet(){
    if(!window.ethereum){
      alert('No injected wallet detected (MetaMask). Please install or use a dapp browser.');
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    try{
      await provider.send('eth_requestAccounts', []);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      accountSpan.textContent = userAddress;
      connectBtn.textContent = 'Connected';
      connectBtn.disabled = true;
    }catch(e){
      console.error(e);
      alert('Failed to connect wallet: '+(e.message||e));
    }
  }

  connectBtn.addEventListener('click', connectWallet);

  async function fetchArtifact(path){
    try{
      const res = await fetch(path);
      if(!res.ok) throw new Error('Failed to fetch '+path+' (status '+res.status+')');
      return await res.json();
    }catch(e){
      console.warn('Could not fetch',path,e);
      return null;
    }
  }

  function clearContracts(){
    contractsRoot.innerHTML = '';
  }

  function renderFunction(contractName, contractInstance, abiEntry){
    const row = document.createElement('div');
    row.className = 'fn-row';

    const meta = document.createElement('div');
    meta.className = 'fn-meta';
    const sig = `${abiEntry.name}(${(abiEntry.inputs||[]).map(i=>i.type).join(',')})`;
    meta.innerHTML = `<strong>${abiEntry.name}</strong> <div class="small">${sig} — ${abiEntry.stateMutability}</div>`;

    const controls = document.createElement('div');
    controls.className = 'fn-controls';

    const inputsWrap = document.createElement('div');
    inputsWrap.className = 'fn-inputs';
    const inputEls = [];
    (abiEntry.inputs||[]).forEach(inp=>{
      const inpEl = document.createElement('input');
      inpEl.placeholder = inp.name + ': ' + inp.type;
      inputEls.push(inpEl);
      inputsWrap.appendChild(inpEl);
    });

    // value input for payable
    let valueInput = null;
    if(abiEntry.stateMutability === 'payable'){
      valueInput = document.createElement('input');
      valueInput.placeholder = 'ETH value (e.g. 0.01)';
      inputsWrap.appendChild(valueInput);
    }

    const actionBtn = document.createElement('button');
    actionBtn.textContent = (abiEntry.stateMutability === 'view' || abiEntry.stateMutability === 'pure') ? 'Call' : 'Send Tx';

    const resultEl = document.createElement('div');
    resultEl.className = 'result';
    resultEl.textContent = '';

    actionBtn.addEventListener('click', async ()=>{
      resultEl.textContent = 'Working...';
      try{
        const args = inputEls.map(i=>parseInput(i.value));
        const iface = new ethers.Interface(contractInstance.interface?.abi || contractInstance.provider ? contractInstance.interfaceAbi : []);
        // use direct call
        if(abiEntry.stateMutability === 'view' || abiEntry.stateMutability === 'pure'){
          const res = await contractInstance[abiEntry.name](...args);
          resultEl.textContent = pretty(res);
        }else{
          if(!signer){
            alert('Please connect wallet to send transactions');
            resultEl.textContent = 'Not connected';
            return;
          }
          const writeContract = contractInstance.connect ? contractInstance.connect(signer) : contractInstance; // ethers v6 contract
          const overrides = {};
          if(valueInput && valueInput.value){
            overrides.value = ethers.parseEther(valueInput.value || '0');
          }
          const tx = await writeContract[abiEntry.name](...args, overrides);
          resultEl.textContent = 'Tx sent: '+ (tx.hash || tx.transactionHash || JSON.stringify(tx));
          try{ await tx.wait?.(); resultEl.textContent += ' — confirmed'; }catch(e){ /* ignore wait error */ }
        }
      }catch(e){
        console.error(e);
        resultEl.textContent = 'Error: '+(e?.message||String(e));
      }
    });

    controls.appendChild(inputsWrap);
    controls.appendChild(actionBtn);
    controls.appendChild(resultEl);

    row.appendChild(meta);
    row.appendChild(controls);
    return row;
  }

  function parseInput(v){
    if(v === undefined || v === null) return v;
    v = v.trim();
    if(v === '') return '';
    // try number
    if(/^0x[0-9a-fA-F]+$/.test(v)) return v; // hex
    if(!isNaN(Number(v))){
      // return number or bigint string? ethers will accept strings
      return v;
    }
    return v;
  }

  function pretty(x){
    try{
      if(x === null) return 'null';
      if(x === undefined) return 'undefined';
      if(typeof x === 'object') return JSON.stringify(x, replacer, 2);
      return String(x);
    }catch(e){ return String(x); }
  }
  function replacer(key,val){
    if(ethers && ethers.BigInt && typeof val === 'bigint') return val.toString();
    if(val && val._isBigNumber) return val.toString();
    return val;
  }

  async function loadAndRender(){
    clearContracts();
    // read addresses
    const addrEmp = document.getElementById('addr_employee').value.trim();
    const addrWal = document.getElementById('addr_wallet').value.trim();
    const addrProt = document.getElementById('addr_protocol').value.trim();

    const pairs = [
      {name:'EmployeeAssignment', addr: addrEmp, path: CONTRACT_ARTIFACTS.EmployeeAssignment},
      {name:'System_wallet', addr: addrWal, path: CONTRACT_ARTIFACTS.System_wallet},
      {name:'TrustlessTeamProtocol', addr: addrProt, path: CONTRACT_ARTIFACTS.TrustlessTeamProtocol}
    ];

    for(const p of pairs){
      const card = document.createElement('div');
      card.className = 'contract-card';
      const title = document.createElement('h3');
      title.textContent = p.name + (p.addr ? (' — '+p.addr) : '');
      card.appendChild(title);

      const artifact = await fetchArtifact(p.path);
      if(!artifact){
        const msg = document.createElement('div'); msg.textContent = 'Could not load ABI at '+p.path; msg.className='small'; card.appendChild(msg);
        contractsRoot.appendChild(card);
        continue;
      }
      loadedArtifacts[p.name] = artifact;

      const abi = artifact.abi || [];
      // create contract instance (provider/signer later)
      let cInstance = null;
      try{
        const usedAddr = p.addr || '0x0000000000000000000000000000000000000000';
        if(provider){
          cInstance = new ethers.Contract(usedAddr, abi, provider);
        }else{
          // create contract with a default provider (ethers fallback to JsonRpcProvider won't work offline) — still ok for ABI-only interactions
          cInstance = new ethers.Contract(usedAddr, abi, new ethers.VoidSigner());
        }
      }catch(e){
        console.warn('contract create failed',e);
      }

      const fnList = abi.filter(a=>a.type === 'function');
      if(fnList.length === 0){
        const nofn = document.createElement('div'); nofn.textContent = 'No callable functions in ABI.'; card.appendChild(nofn);
      }

      fnList.forEach(fn => {
        const fnEl = renderFunction(p.name, cInstance, fn);
        card.appendChild(fnEl);
      });

      contractsRoot.appendChild(card);
    }
  }

  loadBtn.addEventListener('click', loadAndRender);
  resetBtn.addEventListener('click', ()=>{document.getElementById('addr_employee').value='';document.getElementById('addr_wallet').value='';document.getElementById('addr_protocol').value='';clearContracts();});

  // Try to auto-detect window.ethereum and display address if already connected
  (async ()=>{
    if(window.ethereum){
      try{
        provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if(accounts && accounts.length>0){
          signer = await provider.getSigner();
          userAddress = await signer.getAddress();
          accountSpan.textContent = userAddress;
          connectBtn.textContent = 'Connected';
          connectBtn.disabled = true;
        }
      }catch(e){/* ignore */}
    }
  })();

})();
