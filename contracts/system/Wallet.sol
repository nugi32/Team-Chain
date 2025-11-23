// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Pipe/AccesControlPipes.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title System Wallet
/// @notice Upgradeable contract for managing system funds with role-based access control
/// @dev This contract handles receiving and transferring funds with proper access control and reentrancy protection
/// @author Your Name
contract System_wallet is AccesControl, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    /// @notice Total equity tracked by the system wallet
    uint256 internal Total_Equity;
    
    /// @notice Storage gap for future upgrades (50 slots reserved)
    uint256[50] private ___gap; 

    /// @notice Emitted when funds are transferred out of the wallet
    /// @param to The address receiving the funds
    /// @param amount The amount of funds transferred (in wei)
    event contract_transfered_fund(address indexed to, uint256 indexed amount);
    
    /// @notice Emitted when funds are received into the wallet
    /// @param from The address sending the funds
    /// @param amount The amount of funds received (in wei)
    event contract_received_fund(address indexed  from, uint256 indexed amount);
    
    /// @notice Emitted when someone checks the wallet balance
    /// @param caller The address that checked the balance
    event contract_balances_checked(address indexed caller);

    /// @notice Initializes the contract with the employee assignment address
    /// @dev This function replaces the constructor for upgradeable contracts
    /// @param _accessControl The address of the EmployeeAssignment contract that manages roles
    function initialize(address _accessControl) public initializer {
        zero_Address(_accessControl);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        accessControl = IAccessControl(_accessControl);
    }

    /// @notice Transfers funds from the wallet to a specified address
    /// @dev Only the owner can call this function. Protected by reentrancy guard.
    /// @param _to The address to send funds to (must not be zero address)
    /// @param _amount The amount of funds to transfer (in wei)
    /// @custom:security Checks: Zero address validation, insufficient balance check, transfer success validation
    function transfer (address payable _to, uint256 _amount) external onlyOwner nonReentrant callerZeroAddr {
        // Validate that recipient is not zero address
        zero_Address(_to);
        
        // Check if wallet has sufficient balance
        if (address(this).balance < _amount){
            revert ("insuficient balances !");
        } else {
            // Perform the transfer using low-level call
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "transfer to loan contract failed");
        }
        
        // Emit event to log the transfer
        emit contract_transfered_fund(_to, _amount);
    }

    /// @notice Returns the current balance of the wallet in ether
    /// @dev Only employees with the "Employe" role can call this function
    /// @return The wallet balance in ether (excluding wei)
    /// @custom:note This function returns balance divided by 1 ether, so it excludes fractional wei
    function seeBalances () external onlyEmployes callerZeroAddr returns (uint) {
        // Convert balance from wei to ether
        uint balances_in_ether = address(this).balance / 1 ether;
        
        // Emit event to log the balance check
        emit contract_balances_checked(msg.sender);
        
        return balances_in_ether;
    }



    /// @notice Fallback function called when contract receives ether without data
    /// @dev Handles plain ether transfers or calls with empty data
    /// @custom:note Emits contract_received_fund event with sender and value
    fallback() external payable {
        emit contract_received_fund(msg.sender, msg.value);
    }
    
    /// @notice Receive function called when contract receives plain ether
    /// @dev This is the recommended function for receiving ether in modern Solidity
    /// @custom:note Emits contract_received_fund event with sender and value
    receive() external payable {
        emit contract_received_fund(msg.sender, msg.value);
    }
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
}