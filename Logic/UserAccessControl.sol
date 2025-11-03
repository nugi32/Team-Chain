// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title User Registry Interface
/// @notice Interface for UserRegister-compatible contracts to ensure standardized interaction.
/// @dev Defines essential read-only and write functions related to user registration and data.
interface IUserRegister {
    // ===========================
    // User Data View Functions
    // ===========================

 
    function getUserData(address user)
        external
        view
        returns (
            bool isRegistered
        );

    /// @notice Checks if a user is registered.
    /// @param user The address to check.
    /// @return bool True if the user is registered, false otherwise.
    function isUserRegistered(address user) external view returns (bool);

    function seeReputation(address user) external view returns (uint8);
}


/// @title UserAccessControl (Upgradeable)
/// @notice Abstract base contract providing the `onlyRegistered` modifier and helper functions.
/// @dev Designed to be inherited by other upgradeable contracts that depend on user registration validation.
abstract contract UserAccessControl is Initializable {
    /// @notice Reference to the external UserRegister contract.
    IUserRegister public userRegistry;

    // ===========================
    // Initialization
    // ===========================

    /// @dev Replacement for constructor. Initializes the user registry contract reference.
    /// @param _userRegistry The address of the deployed UserRegister contract.
    function __UserAccessControl_init(address _userRegistry) public initializer
    //onlyInitializing // Uncomment in production (for local testing only)
    {
        require(_userRegistry != address(0), "UserAccess: invalid address");
        userRegistry = IUserRegister(_userRegistry);
    }

    // ===========================
    // Modifiers
    // ===========================

    /// @notice Restricts function access to only registered users.
    modifier onlyRegistered() {
        require(userRegistry.isUserRegistered(msg.sender), "UserAccess: Not registered");
        _;
    }

    /// @notice Restricts function access to unregistered users only.
    modifier onlyUnregistered() {
        require(!userRegistry.isUserRegistered(msg.sender), "UserAccess: Already registered");
        _;
    }

    // ===========================
    // Internal Utility
    // ===========================

    /// @notice Helper function to verify registration status of an address.
    /// @param user The address to check.
    /// @return bool True if the user is registered.
    function _isRegistered(address user) internal view returns (bool) {
        return userRegistry.isUserRegistered(user);
    }
    function _seeReputation(address user) internal view returns (uint8) {
        return userRegistry.seeReputation(user);
    }
}
