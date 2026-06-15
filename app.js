import Web3 from 'web3';
import CalculatorArtifact from './build/contracts/Calculator.json';

// DApp State
let web3 = null;
let accounts = [];
let contract = null;
let networkId = null;

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const connectBtnText = connectBtn.querySelector('span');
const networkBadge = document.getElementById('network-badge');
const networkName = document.getElementById('network-name');
const dappTitle = document.getElementById('dapp-title');
const numAInput = document.getElementById('num-a');
const numBInput = document.getElementById('num-b');
const opButtons = document.querySelectorAll('.op-btn');
const calcExpression = document.getElementById('calc-expression');
const calcDisplay = document.getElementById('calc-display');
const txStatusContainer = document.getElementById('tx-status-container');
const txStatusText = document.getElementById('tx-status-text');
const txLoadingSpinner = document.getElementById('tx-loading-spinner');
const newNameInput = document.getElementById('new-name-input');
const setNameBtn = document.getElementById('set-name-btn');
const ledgerItems = document.getElementById('ledger-items');
const ledgerCountBadge = document.getElementById('ledger-count');

// Helper to check if string is an integer
function isInteger(str) {
  if (typeof str !== 'string') return false;
  return !isNaN(str) && Number.isInteger(Number(str));
}

// Format Unix Timestamp
function formatTimestamp(ts) {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString();
}

// Shorten Address for display
function shortenAddress(addr) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

// Update Transaction Status Text
function updateStatus(text, isLoading = false, isError = false) {
  txStatusText.innerText = text;
  
  if (isLoading) {
    txLoadingSpinner.classList.remove('hidden');
    txStatusContainer.style.borderColor = 'rgba(0, 243, 255, 0.3)';
    txStatusContainer.style.background = 'rgba(0, 243, 255, 0.05)';
  } else if (isError) {
    txLoadingSpinner.classList.add('hidden');
    txStatusContainer.style.borderColor = 'rgba(255, 0, 122, 0.3)';
    txStatusContainer.style.background = 'rgba(255, 0, 122, 0.05)';
    txStatusText.style.color = '#ff007a';
  } else {
    txLoadingSpinner.classList.add('hidden');
    txStatusContainer.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    txStatusContainer.style.background = 'rgba(255, 255, 255, 0.02)';
    txStatusText.style.color = '';
  }
}

// Check Metamask Connection & Load Data
async function initDApp() {
  if (typeof window.ethereum === 'undefined') {
    updateStatus('MetaMask is not installed. Please install it to interact with the DApp.', false, true);
    return;
  }

  try {
    // Instantiate web3
    web3 = new Web3(window.ethereum);
    
    // Check if already connected
    accounts = await web3.eth.getAccounts();
    
    if (accounts.length > 0) {
      handleConnected();
    } else {
      updateStatus('Wallet disconnected. Click "Connect Wallet" to start.', false, false);
    }

    // Event listener for MetaMask Account Changes
    window.ethereum.on('accountsChanged', (newAccounts) => {
      accounts = newAccounts;
      if (accounts.length > 0) {
        handleConnected();
      } else {
        handleDisconnected();
      }
    });

    // Event listener for MetaMask Network Changes
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });

  } catch (error) {
    console.error("DApp initialization error:", error);
    updateStatus('Failed to connect to Ethereum provider.', false, true);
  }
}

// When Wallet is Connected
async function handleConnected() {
  connectBtn.classList.add('connected');
  connectBtnText.innerText = shortenAddress(accounts[0]);
  
  networkId = await web3.eth.net.getId();
  
  // Show network info
  networkBadge.classList.remove('hidden');
  networkName.innerText = `Network ID: ${networkId}`;

  // Initialize Contract
  const deployedNetwork = CalculatorArtifact.networks[networkId];
  if (deployedNetwork) {
    contract = new web3.eth.Contract(CalculatorArtifact.abi, deployedNetwork.address);
    updateStatus('Wallet connected. Ready to compute on-chain!');
    
    // Fetch state from smart contract
    await refreshState();
  } else {
    updateStatus('Calculator contract not deployed on this network. Please switch to Ganache.', false, true);
    networkName.innerText = 'Wrong Network';
    networkBadge.style.background = 'rgba(255, 0, 122, 0.1)';
    networkBadge.querySelector('.indicator').style.backgroundColor = 'var(--accent-pink)';
    networkBadge.querySelector('.indicator').style.boxShadow = '0 0 10px var(--accent-pink)';
  }
}

// When Wallet is Disconnected
function handleDisconnected() {
  connectBtn.classList.remove('connected');
  connectBtnText.innerText = 'Connect Wallet';
  networkBadge.classList.add('hidden');
  contract = null;
  dappTitle.innerText = 'DApp Calculator';
  ledgerItems.innerHTML = '<div class="ledger-empty"><p>Connect wallet to load history.</p></div>';
  ledgerCountBadge.innerText = '0 txs';
  updateStatus('Wallet disconnected. Click "Connect Wallet" to start.', false, false);
}

// Refresh DApp title and ledger history
async function refreshState() {
  if (!contract) return;
  
  try {
    // Fetch custom DApp Name
    const name = await contract.methods.getName().call();
    dappTitle.innerText = name;
    
    // Fetch calculation ledger history
    const historyCount = await contract.methods.getHistoryCount().call();
    const count = Number(historyCount);
    ledgerCountBadge.innerText = `${count} txs`;

    if (count === 0) {
      ledgerItems.innerHTML = '<div class="ledger-empty"><p>No computations recorded yet.</p></div>';
      return;
    }

    let listHtml = '';
    // Load up to last 20 calculations
    const limit = Math.max(0, count - 20);
    for (let i = count - 1; i >= limit; i--) {
      const item = await contract.methods.getHistoryItem(i).call();
      
      const op = item[0];
      const valA = item[1].toString();
      const valB = item[2].toString();
      const result = item[3].toString();
      const timestamp = Number(item[4]);

      let opSymbol = '';
      if (op === 'Addition') opSymbol = '+';
      else if (op === 'Subtraction') opSymbol = '−';
      else if (op === 'Multiplication') opSymbol = '×';
      else if (op === 'Division') opSymbol = '÷';

      listHtml += `
        <div class="ledger-item">
          <div class="ledger-item-left">
            <span class="ledger-op-name" style="color: ${op === 'Division' ? 'var(--accent-pink)' : op === 'Multiplication' ? 'var(--accent-purple)' : 'var(--text-muted)'}">${op}</span>
            <span class="ledger-math">
              <span class="highlight-val">${valA}</span> ${opSymbol} <span class="highlight-val">${valB}</span>
            </span>
          </div>
          <div class="ledger-item-right">
            <span class="ledger-result">${result}</span>
            <span class="ledger-time">${formatTimestamp(timestamp)}</span>
          </div>
        </div>
      `;
    }
    ledgerItems.innerHTML = listHtml;

  } catch (error) {
    console.error("Error refreshing state:", error);
  }
}

// Request wallet connection
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    alert('Please install MetaMask to use this application.');
    return;
  }
  
  try {
    updateStatus('Connecting to MetaMask...', true);
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    await handleConnected();
  } catch (error) {
    console.error("Wallet connection failed:", error);
    updateStatus('User rejected the connection request.', false, true);
  }
}

// Perform Arithmetic Operation
async function performArithmetic(operationName) {
  if (!contract) {
    updateStatus('Please connect your wallet first.', false, true);
    return;
  }

  const valAString = numAInput.value.trim();
  const valBString = numBInput.value.trim();

  // Input Validation
  if (valAString === '' || valBString === '') {
    updateStatus('Error: Both fields must contain integer inputs.', false, true);
    return;
  }

  if (!isInteger(valAString) || !isInteger(valBString)) {
    updateStatus('Error: Decimal inputs are not supported by Solidity integers. Enter whole numbers.', false, true);
    return;
  }

  const a = BigInt(valAString);
  const b = BigInt(valBString);

  // Math validations
  if (operationName === 'divide' && b === 0n) {
    updateStatus('Error: Division by zero is not allowed on-chain.', false, true);
    return;
  }

  // Pre-update UI for calculation start
  let mathSymbol = '';
  if (operationName === 'add') mathSymbol = '+';
  else if (operationName === 'subtract') mathSymbol = '−';
  else if (operationName === 'multiply') mathSymbol = '×';
  else if (operationName === 'divide') mathSymbol = '÷';

  calcExpression.innerText = `${a} ${mathSymbol} ${b} = ?`;
  calcDisplay.innerText = '...';
  updateStatus('Sending transaction to blockchain...', true);

  try {
    // Call contract transaction
    const tx = await contract.methods[operationName](a, b).send({ from: accounts[0] });
    
    updateStatus('Transaction successful! Refreshing ledger...', true);

    // Fetch the return result or read from event logs
    // The transaction receipt has events inside it
    const eventName = 'CalculationPerformed';
    let result = '0';
    
    if (tx.events && tx.events[eventName]) {
      result = tx.events[eventName].returnValues.result.toString();
    } else {
      // Fallback: reload state and read from the top of the history ledger
      await refreshState();
      if (ledgerItems.querySelector('.ledger-result')) {
        result = ledgerItems.querySelector('.ledger-result').innerText;
      }
    }

    // Update main display
    calcExpression.innerText = `${a} ${mathSymbol} ${b}`;
    calcDisplay.innerText = result;
    
    updateStatus('Ledger updated. Computation finalized!');
    
    // Clear inputs and reload state
    numAInput.value = '';
    numBInput.value = '';
    await refreshState();

  } catch (error) {
    console.error("Calculation transaction failed:", error);
    calcDisplay.innerText = 'Error';
    
    if (error.message.includes('User denied transaction signature')) {
      updateStatus('Transaction signature denied by user.', false, true);
    } else {
      updateStatus('Transaction reverted. Check console logs for details.', false, true);
    }
  }
}

// Update DApp custom name on-chain
async function updateDappName() {
  if (!contract) {
    updateStatus('Please connect your wallet first.', false, true);
    return;
  }

  const newName = newNameInput.value.trim();
  if (newName === '') {
    updateStatus('Error: Name string cannot be empty.', false, true);
    return;
  }

  updateStatus(`Updating DApp name to "${newName}" on-chain...`, true);

  try {
    await contract.methods.setName(newName).send({ from: accounts[0] });
    newNameInput.value = '';
    updateStatus('DApp name updated successfully!');
    await refreshState();
  } catch (error) {
    console.error("Name update failed:", error);
    if (error.message.includes('User denied transaction signature')) {
      updateStatus('Transaction signature denied by user.', false, true);
    } else {
      updateStatus('Failed to update name on-chain.', false, true);
    }
  }
}

// Event Bindings
connectBtn.addEventListener('click', connectWallet);
setNameBtn.addEventListener('click', updateDappName);

opButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const op = btn.getAttribute('data-op');
    performArithmetic(op);
  });
});

// App Startup
window.addEventListener('load', initDApp);
