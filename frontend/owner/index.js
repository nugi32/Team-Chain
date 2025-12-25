// ==============================
// ADMIN CONNECTOR - Kumpulan semua fungsi admin
// ==============================

// Import dari Access Control
import {
  assignEmployee,
  removeEmployee,
  changeOwner,
  getEmployeeCount,
  getOwnerAddress,
  checkHasRole
} from './connectors/AccessControl-connector.js';

// Import dari Contract Utils
import {
  changeAccessControl,
  pauseAllContracts,
  unpauseAllContracts,
  checkPausedStatus
} from './connectors/ContractUtils.js';

// Import dari Main Contract
import {
  setMemberStakeFromReward,
  withdrawToSystemWallet,
  changeSystemWallet,
  changeStateVarAddress,
  getContractInfo,
  formatContractInfo
} from './connectors/MainContract-connector.js';

// Import dari State Variable
import {
  setComponentWeightPercentages,
  setStakeAmounts,
  setReputationPoints,
  setStateVars,
  setStakeCategories,
  getAllContractSettings
} from './connectors/StateVar-connector.js';

// Import dari System Wallet
import {
  transferFunds,
  checkSystemBalance,
  startEventListener
} from './connectors/systemWallet-conectors.js';

let back = null;
const eventListeners = [];

export function init() {
    back = document.getElementById("back");
    if (!back) return;
    
    back.addEventListener("click", onRegisterClick);
    initializeAllEventListeners();
}

export function destroy() {
    if (back) {
        back.removeEventListener("click", onRegisterClick);
        back = null;
    }
    
    removeAllEventListeners();
}

function onRegisterClick(e) {
    e.preventDefault();
    window.history.back();
}

function initializeAllEventListeners() {
    // ============ STATE VARIABLE SECTION ============
    
    // Component Weight Percentages form
    const weightPercentagesForm = document.getElementById('weightPercentagesForm');
    if (weightPercentagesForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Kirim parameter individual, bukan object
            setComponentWeightPercentages(
                formData.get('rewardScore'),
                formData.get('reputationScore'),
                formData.get('deadlineScore'),
                formData.get('revisionScore')
            ).catch(error => {
                console.error('Error setting component weights:', error);
            });
        };
        weightPercentagesForm.addEventListener('submit', handler);
        eventListeners.push({ element: weightPercentagesForm, event: 'submit', handler });
    }

    // Stake Amounts form
    const stakeAmountsForm = document.getElementById('stakeAmountsForm');
    if (stakeAmountsForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Kirim parameter individual, bukan object
            setStakeAmounts(
                formData.get('low'),
                formData.get('midLow'),
                formData.get('mid'),
                formData.get('midHigh'),
                formData.get('high'),
                formData.get('ultraHigh')
            ).catch(error => {
                console.error('Error setting stake amounts:', error);
            });
        };
        stakeAmountsForm.addEventListener('submit', handler);
        eventListeners.push({ element: stakeAmountsForm, event: 'submit', handler });
    }

    // Reputation Points form
    const reputationPointsForm = document.getElementById('reputationPointsForm');
    if (reputationPointsForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Perhatikan: nama parameter harus sesuai dengan input name
            setReputationPoints(
                formData.get('CancelByMeRP'),        // CancelByMeRP
                formData.get('revisionRP'),          // revisionRP
                formData.get('taskAcceptCreatorRP'), // taskAcceptCreatorRP
                formData.get('taskAcceptMemberRP'),  // taskAcceptMemberRP
                formData.get('deadlineHitCreatorRP'), // deadlineHitCreatorRP
                formData.get('deadlineHitMemberRP')  // deadlineHitMemberRP
            ).catch(error => {
                console.error('Error setting reputation points:', error);
            });
        };
        reputationPointsForm.addEventListener('submit', handler);
        eventListeners.push({ element: reputationPointsForm, event: 'submit', handler });
    }

    // Additional State Variables form
    const additionalStateVarForm = document.getElementById('additionalStateVarForm');
    if (additionalStateVarForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            setStateVars(
                formData.get('maxStakeInEther'),
                formData.get('maxRewardInEther'),
                formData.get('minRevisionTimeInHour'),
                formData.get('NegPenalty'),
                formData.get('feePercentage'),
                formData.get('maxRevision')
            ).catch(error => {
                console.error('Error setting state variables:', error);
            });
        };
        additionalStateVarForm.addEventListener('submit', handler);
        eventListeners.push({ element: additionalStateVarForm, event: 'submit', handler });
    }

    // Stake Categories form
    const stakeCategoriesForm = document.getElementById('stakeCategoriesForm');
    if (stakeCategoriesForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            setStakeCategories(
                formData.get('low'),
                formData.get('midLow'),
                formData.get('mid'),
                formData.get('midHigh'),
                formData.get('high'),
                formData.get('ultraHigh')
            ).catch(error => {
                console.error('Error setting stake categories:', error);
            });
        };
        stakeCategoriesForm.addEventListener('submit', handler);
        eventListeners.push({ element: stakeCategoriesForm, event: 'submit', handler });
    }

    // Test Button - Get all contract settings
    const testBtn = document.getElementById('TestBTN');
    if (testBtn) {
        const handler = function() {
            getAllContractSettings();
        };
        testBtn.addEventListener('click', handler);
        eventListeners.push({ element: testBtn, event: 'click', handler });
    }

    // ============ ACCESS CONTROL SECTION ============
    
    // Assign Employee form
    const assignForm = document.getElementById('assignEmployeeForm');
    if (assignForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const employeeAddress = formData.get('assignEmployee');
            assignEmployee(employeeAddress).catch(error => {
                console.error('Error assigning employee:', error);
            });
        };
        assignForm.addEventListener('submit', handler);
        eventListeners.push({ element: assignForm, event: 'submit', handler });
    }

    // Remove Employee form
    const removeForm = document.getElementById('removeEmployeeForm');
    if (removeForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const employeeAddress = formData.get('removeEmployee');
            removeEmployee(employeeAddress).catch(error => {
                console.error('Error removing employee:', error);
            });
        };
        removeForm.addEventListener('submit', handler);
        eventListeners.push({ element: removeForm, event: 'submit', handler });
    }

    // Change Owner form
    const changeForm = document.getElementById('changeOwnerForm');
    if (changeForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const newOwnerAddress = formData.get('changeOwner');
            changeOwner(newOwnerAddress).catch(error => {
                console.error('Error changing owner:', error);
            });
        };
        changeForm.addEventListener('submit', handler);
        eventListeners.push({ element: changeForm, event: 'submit', handler });
    }

    // Employee Count button
    const employeeCountBtn = document.getElementById('btnEmployeeCount');
    if (employeeCountBtn) {
        const handler = function() {
            getEmployeeCount().catch(error => {
                console.error('Error getting employee count:', error);
            });
        };
        employeeCountBtn.addEventListener('click', handler);
        eventListeners.push({ element: employeeCountBtn, event: 'click', handler });
    }

    // Has Role button
    const hasRoleBtn = document.getElementById('HasRole');
    if (hasRoleBtn) {
        const handler = function() {
            checkHasRole().catch(error => {
                console.error('Error checking role:', error);
            });
        };
        hasRoleBtn.addEventListener('click', handler);
        eventListeners.push({ element: hasRoleBtn, event: 'click', handler });
    }

    // Owner Check button
    const ownerCheckBtn = document.getElementById('ownerCheckBtn');
    if (ownerCheckBtn) {
        const handler = function() {
            getOwnerAddress().catch(error => {
                console.error('Error getting owner address:', error);
            });
        };
        ownerCheckBtn.addEventListener('click', handler);
        eventListeners.push({ element: ownerCheckBtn, event: 'click', handler });
    }

    // ============ SYSTEM WALLET SECTION ============
    
    // Transfer form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = {
                toAddress: formData.get('toAddress'),
                amount: formData.get('amount')
            };
            transferFunds(data.toAddress, data.amount).catch(error => {
                console.error('Error transferring funds:', error);
            });
        };
        transferForm.addEventListener('submit', handler);
        eventListeners.push({ element: transferForm, event: 'submit', handler });
    }

    // Check Balance button
    const checkBalanceBtn = document.getElementById('checkBalanceBtn');
    if (checkBalanceBtn) {
        const handler = function() {
            checkSystemBalance().catch(error => {
                console.error('Error checking balance:', error);
            });
        };
        checkBalanceBtn.addEventListener('click', handler);
        eventListeners.push({ element: checkBalanceBtn, event: 'click', handler });
    }

    // ============ MAIN CONTRACT SECTION ============
    
    // Return Info button
    const returnInfoBtn = document.getElementById('ReturnInfo');
    if (returnInfoBtn) {
        const handler = function() {
            getContractInfo().catch(error => {
                console.error('Error getting contract info:', error);
            });
        };
        returnInfoBtn.addEventListener('click', handler);
        eventListeners.push({ element: returnInfoBtn, event: 'click', handler });
    }

    // Set Member Stake From Reward form
    const setMemberStakeForm = document.getElementById('setMemberStakeForm');
    if (setMemberStakeForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const percentage = formData.get('MemberStakePercentageFromReward');
            setMemberStakeFromReward(percentage).catch(error => {
                console.error('Error setting member stake:', error);
            });
        };
        setMemberStakeForm.addEventListener('submit', handler);
        eventListeners.push({ element: setMemberStakeForm, event: 'submit', handler });
    }

    // Transfer to System Wallet button
    const transferToSystemBtn = document.getElementById('TransferToSystemWallet');
    if (transferToSystemBtn) {
        const handler = function() {
            withdrawToSystemWallet().catch(error => {
                console.error('Error withdrawing to system wallet:', error);
            });
        };
        transferToSystemBtn.addEventListener('click', handler);
        eventListeners.push({ element: transferToSystemBtn, event: 'click', handler });
    }

    // Change System Wallet form
    const changeSystemWalletForm = document.getElementById('changeSystemWalletForm');
    if (changeSystemWalletForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const newAddress = formData.get('SystemWalletAddress');
            changeSystemWallet(newAddress).catch(error => {
                console.error('Error changing system wallet:', error);
            });
        };
        changeSystemWalletForm.addEventListener('submit', handler);
        eventListeners.push({ element: changeSystemWalletForm, event: 'submit', handler });
    }

    // Change State Variable Address form
    const changeStateVarForm = document.getElementById('changeStateVarForm');
    if (changeStateVarForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const newAddress = formData.get('changeStateVariableAddress');
            changeStateVarAddress(newAddress).catch(error => {
                console.error('Error changing state variable address:', error);
            });
        };
        changeStateVarForm.addEventListener('submit', handler);
        eventListeners.push({ element: changeStateVarForm, event: 'submit', handler });
    }

    // ============ CONTRACT MANAGEMENT SECTION ============

    // Change Access Control Address form
    const changeAccessControlForm = document.getElementById('changeAccessControlForm');
    if (changeAccessControlForm) {
        const handler = function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const newAddress = formData.get('changeAccessControlAddress');
            changeAccessControl(newAddress).catch(error => {
                console.error('Error changing access control:', error);
            });
        };
        changeAccessControlForm.addEventListener('submit', handler);
        eventListeners.push({ element: changeAccessControlForm, event: 'submit', handler });
    }

    // Pause Contract button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        const handler = function() {
            pauseAllContracts().catch(error => {
                console.error('Error pausing contracts:', error);
            });
        };
        pauseBtn.addEventListener('click', handler);
        eventListeners.push({ element: pauseBtn, event: 'click', handler });
    }

    // Unpause Contract button
    const unpauseBtn = document.getElementById('unpauseBtn');
    if (unpauseBtn) {
        const handler = function() {
            unpauseAllContracts().catch(error => {
                console.error('Error unpausing contracts:', error);
            });
        };
        unpauseBtn.addEventListener('click', handler);
        eventListeners.push({ element: unpauseBtn, event: 'click', handler });
    }

    // Check Paused button
    const checkPausedBtn = document.getElementById('checkPausedBtn');
    if (checkPausedBtn) {
        const handler = function() {
            checkPausedStatus().catch(error => {
                console.error('Error checking paused status:', error);
            });
        };
        checkPausedBtn.addEventListener('click', handler);
        eventListeners.push({ element: checkPausedBtn, event: 'click', handler });
    }
}

function removeAllEventListeners() {
    eventListeners.forEach(listener => {
        listener.element.removeEventListener(listener.event, listener.handler);
    });
    eventListeners.length = 0;
}

// ============ EKSPOR FUNGSI UTAMA ============
export default {
    init,
    destroy
};