// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserRegister (UUPS Upgradeable)
 * @notice Manages user registration, unregistration, and reputation tracking within the protocol.
 * @dev Uses the UUPS upgradeable pattern and role-based access control inherited from AccesControl.
 */

import "../Logic/AccesControl.sol";
import "../Logic/Reputation.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UserRegister is UserReputation, AccesControl, UUPSUpgradeable {
    // =======================
    //        STRUCTS
    // =======================

    /**
     * @notice Represents user information and performance data.
     * @param reputation User’s current reputation score.
     * @param totalTasksCompleted Number of tasks successfully completed by the user.
     * @param totalTasksFailed Number of failed or abandoned tasks.
     * @param isRegistered Indicates whether the user is currently registered.
     * @param name The display name of the user.
     * @param age The user’s age (optional metadata).
     */
    struct User {
        uint256 totalTasksCreated;
        uint256 totalTasksCompleted;
        uint256 totalTasksFailed;
        uint32 reputation;
        uint8 age;
        bool isRegistered;
        string name;
    }

    /// @notice Mapping of user addresses to their corresponding user data.
    mapping(address => User) internal Users;

    /// @dev Reserved storage gap for upgrade safety and future variable additions.
    uint256[40] private ___gap;

    // =======================
    //        EVENTS
    // =======================

    /// @notice Emitted when a new user is successfully registered.
    /// @param user The wallet address of the newly registered user.
    /// @param name The name provided by the user during registration.
    /// @param age The age provided by the user during registration.
    event UserRegistered(address indexed user, string name, uint8 age);

    /// @notice Emitted when a user successfully unregisters.
    /// @param user The wallet address of the unregistered user.
    /// @param name The last known name of the user before deletion.
    /// @param age The last known age of the user before deletion.
    event UserUnregistered(address indexed user, string name, uint8 age);

    // =======================
    //        MODIFIERS
    // =======================

    /// @notice Restricts access to only registered users.
    modifier onlyRegistered() {
        require(Users[msg.sender].isRegistered, "Err: Not registered");
        _;
    }

    // =======================
    //      INITIALIZER
    // =======================

    /**
     * @notice Initializes the contract and sets the management wallet.
     * @param _employeeAssignment For set employee that assigned.
     * @dev Replaces constructor for upgradeable contracts. Should only be called once.
     */
    function initialize(address payable _employeeAssignment, address _mainContract) public initializer {
        __AccessControl_init(_employeeAssignment);
        __UserReputation_init(_mainContract);
        __UUPSUpgradeable_init();
    }

    // =======================
    //        CORE LOGIC
    // =======================

    /**
     * @notice Registers a new user in the system.
     * @param Name The name chosen by the user.
     * @param Age The age of the user.
     * @dev Can only be called by an address with the USER_ROLE.
     * Emits a {UserRegistered} event upon success.
     */
    function register(
        string calldata Name,
        uint8 Age
    )
        external
        onlyUser
        callerZeroAddr
    {
        User storage t = Users[msg.sender];
        require(!t.isRegistered, "Err: Already registered");

        t.reputation = 0;
        t.totalTasksCompleted = 0;
        t.totalTasksFailed = 0;
        t.isRegistered = true;
        t.name = Name;
        t.age = Age;

        emit UserRegistered(msg.sender, Name, Age);
    }

    /**
     * @notice Unregisters an existing user and removes their stored data.
     * @return A confirmation message string ("Unregister Successfully").
     * @dev Emits a {UserUnregistered} event before deletion.
     * Only callable by registered users with USER_ROLE.
     */
    function Unregister()
        external
        onlyRegistered
        onlyUser
        callerZeroAddr
        returns (string memory)
    {
        User memory t = Users[msg.sender]; // Copy before deletion
        emit UserUnregistered(msg.sender, t.name, t.age);
        delete Users[msg.sender];
        return "Unregister Successfully";
    }

    /**
     * @notice Retrieves the data of the caller (the currently connected user).
     * @return The full user data struct associated with the caller.
     */
    function getMyData()
        external
        onlyRegistered
        onlyUser
        callerZeroAddr
        returns (User memory)
    {
        seeReputation();
        seeCretedTask();
        seeCompleteTask();
        seeFailedTask();
        return Users[msg.sender];
    }

     function seeReputation() public returns(uint32) {
        uint32 rep = _seeMyReputation(msg.sender);
        Users[msg.sender].reputation = rep;
        return rep;
    }

    function seeCretedTask() public returns(uint256) {
        uint256 cr = _seeMyCreatedCounter(msg.sender);
        Users[msg.sender].totalTasksCreated = cr;
        return cr;
    }

    function seeCompleteTask() public returns(uint256) {
        uint256 ct = _seeMyCompleteCounter(msg.sender);
        Users[msg.sender].totalTasksCompleted = ct;
        return ct;
    }

    function seeFailedTask() public returns(uint256) {
        uint256 ft = _seeMyFailedCounter(msg.sender);
        Users[msg.sender].totalTasksFailed = ft;
        return ft;
    }

    /**
     * @notice Retrieves the data of any registered user.
     * @param user The wallet address of the target user.
     * @return The full user data struct of the requested user.
     * @dev Only accessible to addresses with the EMPLOYEE_ROLE.
     */
    function getUser(
        address user
    )
        external
        view
        onlyEmployes
        callerZeroAddr
        returns (User memory)
    {
        return Users[user];
    }

    // =======================
    //     UUPS OVERRIDE
    // =======================

    /**
     * @notice Authorizes contract upgrades.
     * @param newImplementation The address of the new implementation contract.
     * @dev Restricted to the protocol owner or management address.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    /**
     * @notice To export user data.
     * @param user Is The Address That Checked.
     * @notice Return True/False.
     */
    function isUserRegistered(address user) external view returns (bool) {
        return Users[user].isRegistered;
    }
}
