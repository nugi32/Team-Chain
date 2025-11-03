// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title Access Control Helper for Upgradeable Contracts
/// @notice Provides standardized ownership and employee access modifiers based on a central EmployeeAssignment contract.
/// @dev This contract is intended to be inherited by other upgradeable contracts.
/// It relies on an external `IEmployeeAssignment` contract to determine ownership and roles.
interface IEmployeeAssignment {
    /// @notice Returns the address of the contract owner.
    function owner() external view returns (address);

    /// @notice Checks if an account has a specific role.
    /// @param account The address of the account to check.
    /// @return bool True if the account has the given role, false otherwise.
    function hasRole(address account) external view returns (bool);
}

/// @title AccessControl (Upgradeable)
/// @notice Abstract contract providing access modifiers using a shared EmployeeAssignment contract.
/// @dev Uses OpenZeppelin Initializable for upgradeable pattern.
abstract contract AccesControl is Initializable {
    /// @notice Reference to the central EmployeeAssignment contract.
    IEmployeeAssignment public employeeAssignment;

    // ===========================
    // Initialization
    // ===========================

    /// @dev Replacement for constructor to initialize the EmployeeAssignment contract address.
    /// @param _employeeAssignment The address of the EmployeeAssignment contract.
    function __AccessControl_init(address _employeeAssignment) public initializer
    //onlyInitializing //uncomment modifier in production version(this for local testing only)
    {

        require(_employeeAssignment != address(0), "AccessControl: invalid address");
        employeeAssignment = IEmployeeAssignment(_employeeAssignment);
    }

    // ===========================
    // Access Modifiers
    // ===========================

    /// @notice Restricts function access to only the contract owner.
    modifier onlyOwner() {
        require(msg.sender == employeeAssignment.owner(), "Not owner");
        _;
    }

    /// @notice Restricts function access to anyone except the contract owner.
    modifier notOwner() {
        require(msg.sender != employeeAssignment.owner(), "Caller is owner");
        _;
    }

    /// @notice Restricts function access to users with the "Employe" role.
    modifier onlyEmployes() {
        require(employeeAssignment.hasRole(msg.sender), "Not employee");
        _;
    }

    /// @notice Restricts function access to users who do not have the "Employe" role.
    modifier onlyUser() {
        require(!employeeAssignment.hasRole(msg.sender), "Is employee");
        require(msg.sender != employeeAssignment.owner(), "Caller is owner");
        _;
    }

    // ===========================
    // Utility Functions & Modifiers
    // ===========================

    /// @notice Ensures that a provided address is not the zero address.
    /// @dev This function reverts if the address is `address(0)`.
    /// @param x The address to validate.
    function zero_Address(address x) internal pure {
        require(x != address(0), "AccessControl: zero address not allowed");
    }

    /// @notice Restricts calls from the zero address.
    modifier callerZeroAddr() {
        require(msg.sender != address(0), "caller is cant be zero addr !");
        _;
    }
}
