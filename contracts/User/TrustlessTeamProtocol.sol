// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Pipe/StateVarPipes.sol";
import "../Pipe/AccesControlPipes.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TrustlessTeamProtocol v2 (Patched, documented)
 * @author nugi
 * @notice Protocol to create tasks, allow registration/joining, staking and pull-pay reward flows with reputation.
 * @dev Upgradeable contract (UUPS). Uses AccesControl for owner/employee/user roles.
 *
 * Key design points:
 *  - Pull payments: users call withdraw() to claim funds.
 *  - Creator provides reward (in ETH), plus creatorStake and fee in msg.value when creating task.
 *  - Member stakes when requesting to join (stake is returned/used depending on outcome).
 *  - Deadlines are handled via timestamp `deadlineAt`.
 *  - Reputation points and counters are tracked per-user.
 *  - Fee (protocol share) stored in `feeCollected` and withdrawn manually by employees.
 */
contract TrustlessTeamProtocol is
    Initializable,
    AccesControl,
    StateVarPipes,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,    
    UUPSUpgradeable
{
    // =============================================================
    // ENUMS
    // =============================================================

    /// @notice Task lifecycle status
    enum TaskStatus { 
        NonExistent, 
        Created, 
        Active, 
        OpenRegistration, 
        InProgres, 
        Completed, 
        Cancelled 
    }
    
    /// @notice Task value categories based on project valuation algorithm
    enum TaskValue {
        Low, 
        MidleLow,  
        Midle, 
        MidleHigh, 
        High, 
        UltraHigh
    }

    /// @notice Join/submission state per user relative to a task
    enum UserTask { 
        None, 
        Request, 
        Accepted, 
        Rejected, 
        Cancelled 
    }

    /// @notice Submission status for task deliverables
    enum SubmitStatus { 
        NoneStatus, 
        Pending, 
        RevisionNeeded, 
        Accepted 
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    /// @notice User profile with reputation and activity tracking
    struct User {
        uint256 totalTasksCreated;    /// @dev Total tasks created by user
        uint256 totalTasksCompleted;  /// @dev Total tasks successfully completed
        uint256 totalTasksFailed;     /// @dev Total tasks failed or cancelled
        uint128 reputation;           /// @dev Reputation score (affects project valuation)
        uint128 age;                   /// @dev User age (must be 18-100)
        bool isRegistered;           /// @dev Registration status
        string name;                 /// @dev User display name
        string GitProfile;
    }

    /// @notice Core task data structure
    struct Task {
        uint256 taskId;              /// @dev Unique task identifier
        TaskStatus status;           /// @dev Current task status
        TaskValue value;             /// @dev Calculated task value category
        address creator;             /// @dev Task creator address
        address member;              /// @dev Assigned member address
        string title;                /// @dev Task title
        string githubURL;            /// @dev Original GitHub URL/reference
        uint256 reward;              /// @dev Reward amount in wei
        uint32 deadlineHours;        /// @dev Deadline duration in hours
        uint256 deadlineAt;          /// @dev Unix timestamp when deadline expires
        uint256 createdAt;           /// @dev Task creation timestamp
        uint256 creatorStake;        /// @dev Creator's stake amount in wei
        uint256 memberStake;         /// @dev Member's stake amount in wei
        uint8 maxRevision;           /// @dev Maximum allowed revisions
        bool isMemberStakeLocked;    /// @dev Member stake lock status
        bool isCreatorStakeLocked;   /// @dev Creator stake lock status
        bool isRewardClaimed;        /// @dev Reward distribution status
        bool exists;                 /// @dev Task existence flag
    }

    /// @notice Applicant join request for a task
    struct JoinRequest {
        address applicant;           /// @dev Applicant address
        uint256 stakeAmount;         /// @dev Stake amount provided
        UserTask status;             /// @dev Request status
        bool isPending;              /// @dev Pending approval flag
        bool hasWithdrawn;           /// @dev Stake withdrawal status
    }

    /// @notice Task submission record
    struct TaskSubmit {
        string githubURL;            /// @dev Submission GitHub URL
        address sender;              /// @dev Submitter address
        string note;                 /// @dev Submission notes/description
        SubmitStatus status;         /// @dev Submission status
        uint8 revisionTime;          /// @dev Current revision count
        uint256 newDeadline;         /// @dev Extended deadline timestamp
    }

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    /// @dev User address to User profile mapping
    mapping(address => User) public Users;
    mapping(bytes32 => bool) public usedGitURL;

    /// @dev Task ID to submission mapping
    mapping(uint256 => TaskSubmit) public TaskSubmits;

    /// @dev User address to withdrawable balance mapping
    mapping(address => uint256) public withdrawable;

    /// @dev Task ID to Task mapping
    mapping(uint256 => Task) public Tasks;

    /// @dev Task ID to join requests array mapping
    mapping(uint256 => JoinRequest[]) public joinRequests;

    /// @dev Sequential task counter
    uint256 public taskCounter;

    /// @dev Accumulated protocol fees
    uint256 public feeCollected;

    /// @dev Percentage of reward required as member stake
    uint256 public memberStakePercentReward;

    /// @dev Protocol fee recipient address
    address payable public systemWallet;

    /// @dev Storage gap for future upgrades
    uint256[40] private ___gap;

    // =============================================================
    // EVENTS
    // =============================================================

    // User events
    event UserRegistered(address indexed user, string name, uint128 age);
    event UserUnregistered(address indexed user, string name, uint128 age);

    // Task lifecycle events
    event TaskCreated(string title, uint256 indexed taskId, address indexed creator, uint256 reward, uint256 creatorStake);
    event RegistrationOpened(uint256 indexed taskId);
    event RegistrationClosed(uint256 indexed taskId);
    event JoinRequested(uint256 indexed taskId, address indexed applicant, uint256 stakeAmount);
    event JoinApproved(uint256 indexed taskId, address indexed applicant);
    event JoinRejected(uint256 indexed taskId, address indexed applicant);
    event TaskCancelledByMe(uint256 indexed taskId, address indexed initiator);
    event TaskSubmitted(uint256 indexed taskId, address indexed member, string githubURL);
    event TaskReSubmitted(uint256 indexed taskId, address indexed member);
    event TaskApproved(uint256 indexed taskId);
    event RevisionRequested(uint256 indexed taskId, uint8 revisionCount, uint256 newDeadline);
    event DeadlineTriggered(uint256 indexed taskId);
    event JoinrequestCancelled(uint256 indexed taskId, address indexed user);
    event TaskActive(uint256 indexed taskId);
    event TaskDeleted(uint256 taskId);
    event Withdrawal(address indexed user, uint256 amount);

    // Payments / system events
    event systemChanged(string info, address indexed newAddress, uint256 indexed value);

    // =============================================================
    // ERRORS
    // =============================================================

    // Task errors
    error TaskDoesNotExist();
    error NotTaskCreator();
    error NotTaskMember();
    error AlreadyRequestedJoin();
    error TaskNotOpen();
    error NotCounterparty();
    error InsufficientStake();
    error StakeHitLimit();
    error CancelOnlyWhenMemberAssigned();
    error TaskNotSubmittedYet();
    
    // Validation errors
    error InvalidTitle();
    error InvalidDeadline();
    error TooManyRevisions();
    error InvalidRewardAmount();
    error InvalidStakeAmount();
    error InvalidReason();
    
    // Math/overflow errors
    error RewardOverflow();
    error ValueMismatch();
    error StakeOverflow();
    error StakeMismatch();
    
    // Submission errors
    error NoSubmision();
    error submissionAlreadyPending();
    error alredyInPending();
    
    // Payment errors
    error AlredyClaimed();
    
    // Deadline errors
    error DeadlineNotExceeded();
    
    // System errors
    error InvalidMemberStakePercentReward();

    
    // User registration errors
    error AlredyRegistered();
    error NotRegistered();

    // =============================================================
    // MODIFIERS
    // =============================================================

    /// @dev Verifies task exists
    modifier taskExists(uint256 _taskId) {
        if (!Tasks[_taskId].exists) revert TaskDoesNotExist();
        _;
    }

    /// @dev Restricts access to task creator only
    modifier onlyTaskCreator(uint256 _taskId) {
        if (Tasks[_taskId].creator != msg.sender) revert NotTaskCreator();
        _;
    }

    /// @dev Restricts access to task member only
    modifier onlyTaskMember(uint256 _taskId) {
        if (Tasks[_taskId].member != msg.sender) revert NotTaskMember();
        _;
    }

    /// @dev Requires user to be registered
    modifier onlyRegistered() {
        if (!Users[msg.sender].isRegistered) revert NotRegistered();
        _;
    }

    // =============================================================
    // INITIALIZER
    // =============================================================

    /**
     * @notice Initializes the contract with required addresses and parameters
     * @param _accessControl Address of the access control contract
     * @param _systemWallet Address for protocol fee withdrawals
     * @param _stateVar Address of the state variables contract
     * @param _initialmemberStakePercentReward Initial percentage for member stake calculation
     * @dev Initializes parent contracts and sets up protocol configuration
     */
    function initialize(
        address _accessControl,
        address payable _systemWallet,
        address _stateVar,
        uint256 _initialmemberStakePercentReward
    ) public initializer {
        // Validate input addresses
        zero_Address(_systemWallet);
        zero_Address(_accessControl);
        zero_Address(_stateVar);

        // Initialize parent contracts
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // Set up access control and state variables
        accessControl = IAccessControl(_accessControl);
        stateVar = stateVariable(_stateVar);

        // Initialize system configuration
        systemWallet = _systemWallet;
        taskCounter = 0;
        feeCollected = 0;
        memberStakePercentReward = _initialmemberStakePercentReward;
    }

    // =============================================================
    // USER MANAGEMENT
    // =============================================================

    /**
     * @notice Registers a new user in the protocol
     * @param Name User's display name
     * @param Age User's age (must be between 18-100)
     * @dev Creates a new user profile with initial reputation and counters
     */
    function Register(string calldata Name, uint128 Age, string calldata githubURL, address user)
        external
        onlyUser
        callerZeroAddr
    {
        User storage u = Users[user]; 
        
        // Validate registration
        if (u.isRegistered) revert AlredyRegistered();
        bytes32 gitHash = keccak256(abi.encodePacked(githubURL));

        // Initialize user profile
        u.reputation = 0;
        u.totalTasksCompleted = 0;
        u.totalTasksFailed = 0;
        u.isRegistered = true;
        u.name = Name;
        u.age = Age;
        u.GitProfile = githubURL;
        usedGitURL[gitHash] = true;

        emit UserRegistered(user, Name, Age);
    }

    /**
     * @notice Unregisters a user and deletes their profile data
     * @return confirmation Confirmation message
     * @dev Removes user from protocol and clears their data
     */
    function Unregister(address user)
        external
        onlyRegistered
        onlyUser
        callerZeroAddr
        returns (string memory)
    {
        User memory u = Users[user];
        bytes32 gitHash = keccak256(abi.encodePacked(u.GitProfile));
        usedGitURL[gitHash] = false;
        emit UserUnregistered(user, u.name, u.age);
        delete Users[user];
        return "Unregister Successfully";
    }

    // =============================================================
    // TASK LIFECYCLE - CREATION & ACTIVATION
    // =============================================================

    /**
     * @notice Creates a new task with initial parameters
     * @param Title Task title/description
     * @param GithubURL Reference GitHub URL for the task
     * @param DeadlineHours Deadline duration in hours
     * @param MaximumRevision Maximum number of allowed revisions
     * @dev Creates task in Created status, requires reward amount in msg.value
     */
    function createTask(
        string memory Title,
        string memory GithubURL,
        uint32 DeadlineHours,
        uint8 MaximumRevision,
        address user
    ) external payable whenNotPaused onlyRegistered nonReentrant onlyUser callerZeroAddr {
        // Increment and get new task ID
        taskCounter++;
        uint256 taskId = taskCounter;

        // Create new task
        Tasks[taskId] = Task({
            taskId: taskId,
            status: TaskStatus.Created,
            value: __getProjectValueCategory(DeadlineHours, MaximumRevision, msg.value, user),
            creator: user,
            member: address(0),
            title: Title,
            githubURL: GithubURL,
            reward: msg.value,
            deadlineHours: DeadlineHours,
            deadlineAt: 0, // Set when member is assigned
            createdAt: block.timestamp,
            creatorStake: 0,
            memberStake: 0,
            maxRevision: MaximumRevision,
            isMemberStakeLocked: false,
            isCreatorStakeLocked: false,
            isRewardClaimed: false,
            exists: true
        });

        // Update creator statistics
        Users[user].totalTasksCreated++;

        emit TaskCreated(Title, taskId, user, msg.value, 0);
    }

     function deleteTask(uint256 taskId, address user) external nonReentrant onlyRegistered {
        Task storage t = Tasks[taskId];

        t.status = TaskStatus.Cancelled;
        t.isCreatorStakeLocked = false;
        t.exists = false;

        withdrawable[user] += t.reward;
        if (t.creatorStake > 0) {
            withdrawable[user] += t.creatorStake;
        }
        emit TaskDeleted(taskId);
    }

    /**
     * @notice Activates a task by providing creator stake
     * @param taskId ID of the task to activate
     * @dev Moves task to Active status, requires calculated creator stake in msg.value
     */
    function activateTask(uint256 taskId) external payable taskExists(taskId) onlyTaskCreator(taskId) nonReentrant whenNotPaused {
        Task storage t = Tasks[taskId];
        
        // Validate task state and stake amount
        if (t.status != TaskStatus.Created) revert TaskNotOpen();
        if (msg.value != __getCreatorStake(t.deadlineHours, t.maxRevision, t.reward, t.creator)) revert StakeMismatch();

        // Calculate and deduct protocol fee
        uint256 totalFee = (msg.value * ___getFeePercentage()) / 100;
        t.creatorStake = msg.value - totalFee;
        
        // Update task state
        t.status = TaskStatus.Active;
        t.isCreatorStakeLocked = true;
        feeCollected += totalFee;
        
        emit TaskActive(taskId);
    }

    // =============================================================
    // TASK LIFECYCLE - REGISTRATION & JOINING
    // =============================================================

    /**
     * @notice Opens task for member registration
     * @param taskId ID of the task to open for registration
     * @dev Changes task status to OpenRegistration allowing join requests
     */
    function openRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) whenNotPaused {
        Task storage t = Tasks[taskId];
        if (t.status != TaskStatus.Active) revert TaskNotOpen();
        t.status = TaskStatus.OpenRegistration;
        emit RegistrationOpened(taskId);
    }

    /**
     * @notice Closes task registration
     * @param taskId ID of the task to close registration for
     * @dev Returns task to Active status, preventing new join requests
     */
    function closeRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) whenNotPaused {
        Task storage t = Tasks[taskId];
        if (t.status != TaskStatus.OpenRegistration) revert TaskNotOpen();
        t.status = TaskStatus.Active;
        emit RegistrationClosed(taskId);
    }

    /**
     * @notice Requests to join a task by providing required stake
     * @param taskId ID of the task to join
     * @dev Requires exact member stake amount in msg.value, creates pending join request
     */
    function requestJoinTask(uint256 taskId, address user) external payable taskExists(taskId) whenNotPaused onlyRegistered onlyUser callerZeroAddr {
        Task storage t = Tasks[taskId];
        JoinRequest[] storage reqs = joinRequests[taskId];

        // Check for duplicate pending requests
        for (uint256 i = 0; i < reqs.length; ++i) {
            if (reqs[i].applicant == user && reqs[i].isPending) revert AlreadyRequestedJoin();
        }

        // Validate task state and permissions
        if (t.status != TaskStatus.OpenRegistration) revert TaskNotOpen();
        if (user == t.creator) revert TaskNotOpen();

        // Validate stake amount
        uint256 memberStake = getMemberRequiredStake(taskId);
        if (___getMaxStake() < memberStake) revert StakeHitLimit();
        if (msg.value != memberStake) revert InsufficientStake();

        // Create new join request
        joinRequests[taskId].push(JoinRequest({
            applicant: user,
            stakeAmount: msg.value,
            status: UserTask.Request,
            isPending: true,
            hasWithdrawn: false
        }));

        emit JoinRequested(taskId, user, msg.value);
    }

    /**
     * @notice Withdraws a pending join request and returns stake
     * @param taskId ID of the task to withdraw join request from
     * @dev Returns stake to user's withdrawable balance
     */
    function withdrawJoinRequest(uint256 taskId, address user) external nonReentrant onlyRegistered {
        JoinRequest[] storage reqs = joinRequests[taskId];
        
        // Find and process pending request
        for (uint256 i = 0; i < reqs.length; ++i) {
            if (reqs[i].applicant == user && reqs[i].isPending && !reqs[i].hasWithdrawn) {
                reqs[i].isPending = false;
                reqs[i].status = UserTask.Cancelled;
                reqs[i].hasWithdrawn = true;
                uint256 stake = reqs[i].stakeAmount;
                reqs[i].stakeAmount = 0;
                withdrawable[user] += stake;
                emit JoinrequestCancelled(taskId, user);
                return;
            }
        }
        revert("no pending request");
    }

    /**
     * @notice Approves a join request and assigns member to task
     * @param taskId ID of the task
     * @dev Locks member stake, sets deadline, and moves task to InProgress status
     */
    function approveJoinRequest(uint256 taskId, address applicant) external taskExists(taskId) onlyTaskCreator(taskId) nonReentrant whenNotPaused {
        JoinRequest[] storage requests = joinRequests[taskId];
        Task storage t = Tasks[taskId];
        bool found = false;

        // Find and approve the request
        for (uint256 i = 0; i < requests.length; ++i) {
            if (requests[i].applicant == applicant && requests[i].isPending) {
                requests[i].isPending = false;
                requests[i].status = UserTask.Accepted;
                
                // Assign member and lock stakes
                t.member = requests[i].applicant;
                t.memberStake = requests[i].stakeAmount;
                requests[i].stakeAmount = 0;
                requests[i].hasWithdrawn = true;
                t.isMemberStakeLocked = true;
                found = true;
                break;
            }
        }
        require(found, "request not found");

        // Set task deadline and update status
        t.deadlineAt = block.timestamp + (uint256(t.deadlineHours) * 1 hours);
        t.status = TaskStatus.InProgres;

        emit JoinApproved(taskId, t.member);
    }

    /**
     * @notice Rejects a join request and returns stake to applicant
     * @param taskId ID of the task
     * @param _applicant Address of the applicant to reject
     * @dev Returns stake to applicant's withdrawable balance
     */
    function rejectJoinRequest(uint256 taskId, address _applicant) external taskExists(taskId) onlyTaskCreator(taskId) nonReentrant whenNotPaused {
        JoinRequest[] storage requests = joinRequests[taskId];
        bool found = false;

        // Find and reject the request
        for (uint256 i = 0; i < requests.length; ++i) {
            if (requests[i].applicant == _applicant && requests[i].isPending) {
                requests[i].isPending = false;
                requests[i].status = UserTask.Rejected;
                uint256 stake = requests[i].stakeAmount;
                requests[i].stakeAmount = 0;
                requests[i].hasWithdrawn = true;
                withdrawable[_applicant] += stake;
                found = true;
                break;
            }
        }
        require(found, "request not found");
        emit JoinRejected(taskId, _applicant);
    }

    // =============================================================
    // TASK CANCELLATION
    // =============================================================

    /**
     * @notice Cancels a task by either party with penalty distribution
     * @param taskId ID of the task to cancel
     * @dev Applies penalties based on who initiates cancellation and updates reputation
     */
    function cancelByMe(uint256 taskId, address user) external taskExists(taskId) nonReentrant onlyUser whenNotPaused {
        Task storage t = Tasks[taskId];

        // Validate permissions and state
        if (user != t.creator && user != t.member) revert NotCounterparty();
        if (t.status != TaskStatus.InProgres) revert TaskNotOpen();

        if (user == t.member) {
            // Member cancellation: member loses portion of stake to creator
            uint256 penaltyToCreator = (t.memberStake * ___getNegPenalty()) / 100;
            uint256 memberReturn = (t.memberStake * __CounterPenalty()) / 100;

            // Distribute funds
            withdrawable[t.creator] += t.creatorStake + t.reward + penaltyToCreator;
            withdrawable[t.member] += memberReturn;

            // Unlock stakes
            t.isMemberStakeLocked = false;
            t.isCreatorStakeLocked = false;
        } else {
            // Creator cancellation: creator loses portion of stake to member
            if (t.member == address(0)) revert CancelOnlyWhenMemberAssigned();

            uint256 penaltyToMember = (t.creatorStake * ___getNegPenalty()) / 100;
            uint256 creatorReturn = (t.creatorStake * __CounterPenalty()) / 100 + t.reward;

            withdrawable[t.member] += t.memberStake + penaltyToMember;
            withdrawable[t.creator] += creatorReturn;

            t.isMemberStakeLocked = false;
            t.isCreatorStakeLocked = false;
        }

        // Update task status
        t.status = TaskStatus.Cancelled;

        // Apply reputation penalty
        if (Users[user].isRegistered) {
            if (Users[user].reputation < ___getCancelByMe()) {
                Users[user].reputation = 0;
            } else {
                Users[user].reputation -= ___getCancelByMe();
            }
        }

        // Update failure counter
        Users[user].totalTasksFailed++;

        emit TaskCancelledByMe(taskId, user);
    }

    // =============================================================
    // SUBMISSION & APPROVAL FLOW
    // =============================================================

    /**
     * @notice Submits task completion by member
     * @param taskId ID of the task
     * @param PullRequestURL GitHub URL of the submission
     * @param Note Description/notes about the submission
     * @dev Creates submission record in Pending status for creator review
     */
    function requestSubmitTask(uint256 taskId, string calldata PullRequestURL, string calldata Note, address user)
        external
        taskExists(taskId)
        onlyTaskMember(taskId)
        whenNotPaused
        onlyUser
    {
        Task storage t = Tasks[taskId];
        
        // Validate task state and input
        if (t.status != TaskStatus.InProgres) revert TaskNotOpen();
        if (t.member != user) revert NotTaskMember();

        TaskSubmit storage s = TaskSubmits[taskId];
        if (s.sender != address(0) && s.status == SubmitStatus.Pending) revert submissionAlreadyPending();

        // Create submission record
        TaskSubmits[taskId] = TaskSubmit({
            githubURL: PullRequestURL,
            sender: user,
            note: Note,
            status: SubmitStatus.Pending,
            revisionTime: 0,
            newDeadline: t.deadlineAt
        });

        emit TaskSubmitted(taskId, user, PullRequestURL);
    }

    /**
     * @notice Resubmits task after revision request
     * @param taskId ID of the task
     * @param Note Updated submission notes
     * @param GithubFixedURL Updated GitHub URL
     * @dev Updates submission and returns it to Pending status
     */
    function reSubmitTask(uint256 taskId, string calldata Note, string calldata GithubFixedURL, address user)
        external
        taskExists(taskId)
        onlyTaskMember(taskId)
        whenNotPaused
        onlyUser
    {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];

        // Validate submission state
        if (s.sender == address(0)) revert NoSubmision();
        if (t.member != user) revert NotTaskMember();
        if (s.status != SubmitStatus.RevisionNeeded) revert TaskNotOpen();

        // Auto-approve if revision limit exceeded
        if (s.revisionTime > t.maxRevision) {
            if (s.status == SubmitStatus.Pending) {
                revert alredyInPending();
            } else {
                __approveTask(taskId);
                return;
            }
        }

        // Validate input and update submission

        s.note = Note;
        s.status = SubmitStatus.Pending;
        s.githubURL = GithubFixedURL;

        emit TaskReSubmitted(taskId, user);
    }

    /**
     * @notice Requests revision for a submission
     * @param taskId ID of the task
     * @param Note Revision instructions/feedback
     * @param additionalDeadlineHours Additional hours for revised deadline
     * @dev Extends deadline and applies reputation penalties to both parties
     */
    function requestRevision(uint256 taskId, string calldata Note, uint256 additionalDeadlineHours)
        external
        whenNotPaused
    {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];

        // Validate state and input
        if (s.status != SubmitStatus.Pending) revert TaskNotOpen();

        // Calculate new deadline
        uint256 additionalSeconds = (additionalDeadlineHours * 1 hours);

        // Update submission state
        s.status = SubmitStatus.RevisionNeeded;
        s.note = Note;
        s.revisionTime++;
        t.deadlineAt = block.timestamp + additionalSeconds;

        // Auto-approve if revision limit exceeded
        if (s.revisionTime > t.maxRevision) {
            if (s.status == SubmitStatus.Pending) {
                revert alredyInPending();
            } else {
                __approveTask(taskId);
                return;
            }
        }

        // Apply reputation penalties for revision
        if (Users[t.member].isRegistered) {
            if (Users[t.member].reputation < ___getRevisionPenalty()) {
                Users[t.member].reputation = 0;
            } else {
                Users[t.member].reputation -= ___getRevisionPenalty();
            }
        }
        if (Users[t.creator].isRegistered) {
            if (Users[t.creator].reputation < ___getRevisionPenalty()) {
                Users[t.creator].reputation = 0;
            } else {
                Users[t.creator].reputation -= ___getRevisionPenalty();
            }
        }

        emit RevisionRequested(taskId, s.revisionTime, t.deadlineAt);
    }

    /**
     * @notice Approves task completion and distributes rewards
     * @param taskId ID of the task to approve
     * @dev External wrapper for internal approval function
     */
    function approveTask(uint256 taskId)
        external
        taskExists(taskId)
        onlyTaskCreator(taskId)
        nonReentrant
        whenNotPaused
    {
        __approveTask(taskId);
    }

    // =============================================================
    // DEADLINE HANDLING
    // =============================================================

    /**
     * @notice Triggers deadline consequences for expired tasks
     * @param taskId ID of the task to trigger deadline for
     * @dev Can be called by anyone, distributes stakes with penalties
     */
    function triggerDeadline(uint256 taskId) public taskExists(taskId) whenNotPaused nonReentrant {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];

        // Validate deadline conditions
        if (s.status == SubmitStatus.Pending) revert alredyInPending();
        if (t.status != TaskStatus.InProgres) revert TaskNotOpen();
        if (t.deadlineAt == 0) revert InvalidDeadline();
        if (block.timestamp < t.deadlineAt) revert DeadlineNotExceeded();

        // Distribute stakes with penalties
        if (t.member != address(0) && t.memberStake > 0) {
            uint256 toMember = (t.memberStake * ___getNegPenalty()) / 100;
            uint256 toCreator = (t.memberStake * __CounterPenalty()) / 100;

            withdrawable[t.member] += toMember;
            withdrawable[t.creator] += toCreator + t.creatorStake + t.reward;

            // Unlock stakes
            t.isMemberStakeLocked = false;
            t.isCreatorStakeLocked = false;
        } else {
            // No member assigned, return funds to creator
            withdrawable[t.creator] += t.creatorStake + t.reward;
            t.isMemberStakeLocked = false;
            t.isCreatorStakeLocked = false;
        }

        // Apply reputation penalties
        if (Users[t.member].isRegistered) {
            if (Users[t.member].reputation < ___getDeadlineHitMember()) {
                Users[t.member].reputation = 0;
            } else {
                Users[t.member].reputation -= ___getDeadlineHitMember();
            }
        }

        if (Users[t.creator].isRegistered) {
            if (Users[t.creator].reputation < ___getDeadlineHitCreator()) {
                Users[t.creator].reputation = 0;
            } else {
                Users[t.creator].reputation -= ___getDeadlineHitCreator();
            }
        }

        // Update task state and counters
        t.status = TaskStatus.Cancelled;
        Users[t.creator].totalTasksFailed++;
        if (t.member != address(0)) {
            Users[t.member].totalTasksFailed++;
        }

        emit DeadlineTriggered(taskId);
    }

    // =============================================================
    // PAYMENT WITHDRAWALS
    // =============================================================

    /**
     * @notice Withdraws available balance to caller
     * @dev Implements pull payment pattern, transfers available ETH to caller
     */
    function withdraw(address user) external nonReentrant onlyUser whenNotPaused {
        uint256 amount = withdrawable[user];
        
        // Reset balance before transfer to prevent reentrancy
        withdrawable[user] = 0;
        
        // Transfer funds
        (bool ok, ) = payable(user).call{value: amount}("");
        require(ok, "withdraw failed");
        
        emit Withdrawal(user, amount);
    }

    // =============================================================
    // INTERNAL HELPERS
    // =============================================================

    /**
     * @notice Calculates project value score based on task parameters
     * @param DeadlineHours Task deadline in hours
     * @param MaximumRevision Maximum allowed revisions
     * @param rewardWei Task reward in wei
     * @param Caller Task creator address
     * @return _value Calculated project value score
     * @dev Uses weighted formula considering reward, revisions, reputation, and deadline
     */
    function __getProjectValueNum(
        uint32 DeadlineHours,
        uint8 MaximumRevision,
        uint256 rewardWei,
        address Caller
    ) internal view returns (uint256) {
        // Convert reward to ether units for calculation
        uint256 rewardEtherUnits = rewardWei / 1 ether;
        
        // Calculate positive factors (reward and revisions)
        uint256 pos = (___getRewardScore() * rewardEtherUnits) + ((___getRevisionScore() * MaximumRevision));
        
        // Calculate negative factors (reputation and deadline)
        uint256 neg = (___getReputationScore() * __seeReputation(Caller)) + (___getDeadlineScore() * DeadlineHours);
        
        uint256 rawValue;

        // Calculate raw value (ensure non-negative)
        if (pos <= neg) {    
            rawValue = 0;
        } else {
            rawValue = pos - neg;
        }
        
        // Normalize value
        uint256 _value = (rawValue * 1 ether) / 100;
        return _value;
    }

    /**
     * @notice Categorizes project value into TaskValue enum
     * @param DeadlineHours Task deadline in hours
     * @param MaximumRevision Maximum allowed revisions
     * @param rewardWei Task reward in wei
     * @param Caller Task creator address
     * @return TaskValue category based on calculated score
     * @dev Uses threshold values from state variables to determine category
     */
    function __getProjectValueCategory(
        uint32 DeadlineHours,
        uint8 MaximumRevision,
        uint256 rewardWei,
        address Caller
    ) internal view returns (TaskValue) {
        uint256 _value = __getProjectValueNum(DeadlineHours, MaximumRevision, rewardWei, Caller);

        // Categorize based on threshold values
        if (_value <= ___getCategoryLow()) {
            return TaskValue.Low;
        } else if (_value <= ___getCategoryMidleLow()) {
            return TaskValue.MidleLow;
        } else if (_value <= ___getCategoryMidle()) {
            return TaskValue.Midle;
        } else if (_value <= ___getCategoryMidleHigh()) {
            return TaskValue.MidleHigh;
        } else if (_value <= ___getCategoryHigh()) {
            return TaskValue.High;
        } else {
            return TaskValue.UltraHigh;
        }
    }

    /**
     * @notice Calculates required creator stake based on task value category
     * @param DeadlineHours Task deadline in hours
     * @param MaximumRevision Maximum allowed revisions
     * @param rewardWei Task reward in wei
     * @param Caller Task creator address
     * @return Required creator stake amount in wei
     * @dev Stake amount varies based on project value categorization
     */
    function __getCreatorStake(
        uint32 DeadlineHours,
        uint8 MaximumRevision,
        uint256 rewardWei,
        address Caller
    ) public view returns (uint256) {
        TaskValue category = __getProjectValueCategory(DeadlineHours, MaximumRevision, rewardWei, Caller);

        // Return stake amount based on category
        if (category == TaskValue.Low) {
            return ___getStakeLow();
        } else if (category == TaskValue.MidleLow) {
            return ___getStakeMidLow();
        } else if (category == TaskValue.Midle) {
            return ___getStakeMid();
        } else if (category == TaskValue.MidleHigh) {
            return ___getStakeMidHigh();
        } else if (category == TaskValue.High) {
            return ___getStakeHigh();
        } else {
            return ___getStakeUltraHigh();
        }
    }

    /**
     * @notice Retrieves reputation score for an address
     * @param who Address to check reputation for
     * @return reputation score (0 if user not registered)
     * @dev Fallback for compatibility with different user data structures
     */
    function __seeReputation(address who) internal view returns (uint128) {
        if (Users[who].isRegistered) {
            return Users[who].reputation;
        } else {
            return 0;
        }
    }

    /**
     * @notice Internal function to approve task and distribute rewards
     * @param taskId ID of the task to approve
     * @dev Distributes rewards, updates reputation, and completes task lifecycle
     */
    function __approveTask(uint256 taskId) internal {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];

        // Validate task and submission state
        if (t.status != TaskStatus.InProgres) revert TaskNotOpen();
        if (s.status != SubmitStatus.Pending) revert TaskNotSubmittedYet();
        if (t.isRewardClaimed == true) revert AlredyClaimed();
        if (s.sender == address(0)) revert NoSubmision();

        // Calculate payout amounts
        uint256 memberGet = t.reward + t.memberStake;
        uint256 creatorGet = t.creatorStake;

        // Credit withdrawable balances
        withdrawable[t.member] += memberGet;
        withdrawable[t.creator] += creatorGet;

        // Update task state
        t.isMemberStakeLocked = false;
        t.isCreatorStakeLocked = false;
        t.isRewardClaimed = true;
        t.status = TaskStatus.Completed;

        // Update reputation
        if (Users[t.member].isRegistered) Users[t.member].reputation += ___getTaskAcceptMember();
        if (Users[t.creator].isRegistered) Users[t.creator].reputation += ___getTaskAcceptCreator();

        // Update completion counters
        Users[t.creator].totalTasksCompleted++;
        Users[t.member].totalTasksCompleted++;

        // Clear submission data
        s.githubURL = "";
        s.sender = address(0);
        s.note = "";
        s.status = SubmitStatus.Accepted;
        s.revisionTime = 0;
        s.newDeadline = 0;

        emit TaskApproved(taskId);
    }

    /**
     * @notice Calculates counter penalty percentage
     * @return Counter penalty percentage (100 - negative penalty)
     * @dev Used to calculate the portion returned to the non-penalized party
     */
    function __CounterPenalty() internal view returns (uint64) {
        return uint32(100) - ___getNegPenalty();
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Checks joint request count
     * @return Length of arr
     */
    function getJoinRequestCount(uint256 taskId) external view returns (uint256) {
        return joinRequests[taskId].length;
    }


    /**
     * @notice Calculates required creator stake for a taskF
     * @param taskId ID of the task
     * @return Required creator stake amount in wei
     */
    function getCreatorStake(uint256 taskId) public view taskExists(taskId) whenNotPaused returns (uint256) {
        Task storage t = Tasks[taskId];
        return __getCreatorStake(t.deadlineHours, t.maxRevision, t.reward, t.creator);
    }

    /**
     * @notice Calculates required member stake for a task
     * @param taskId ID of the task
     * @return Required member stake amount in wei
     */
    function getMemberRequiredStake(uint256 taskId) public view taskExists(taskId) returns (uint256) {
        Task storage t = Tasks[taskId];
        return (t.reward * memberStakePercentReward) / 100;
    }

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Sets the member stake percentage relative to task reward
     * @param NewmemberStakePercentReward New percentage value (0-100)
     * @dev Only callable by employees, affects stake calculation for new join requests
     */
    function setMemberStakePercentageFromStake(uint256 NewmemberStakePercentReward) external onlyEmployes whenNotPaused {
        if (NewmemberStakePercentReward == 0 || NewmemberStakePercentReward > 100) revert InvalidMemberStakePercentReward();
        memberStakePercentReward = NewmemberStakePercentReward;
        emit systemChanged("setMemberStakePercentageFromStake", address(0), NewmemberStakePercentReward);
    }

    /**
     * @notice Withdraws accumulated protocol fees to system wallet
     * @dev Only callable by employees, transfers collected fees to systemWallet
     */
    function withdrawToSystemWallet() external onlyEmployes nonReentrant whenNotPaused {
        uint256 amount = feeCollected;
        feeCollected = 0;
        (bool ok, ) = systemWallet.call{value: amount}("");
        require(ok, "withdraw failed");
        emit systemChanged("withdrawToSystemWallet", address(0), amount);
    }


    // ============================================================= Only Owner Functions ============================================================

    /**
     * @notice Updates system wallet address
     * @param _NewsystemWallet New system wallet address
     * @dev Only callable by owner, affects fee withdrawals
     */
    function changeSystemwallet(address payable _NewsystemWallet) external onlyOwner whenNotPaused {
        zero_Address(_NewsystemWallet);
        systemWallet = _NewsystemWallet;
        emit systemChanged("changeSystemwallet", _NewsystemWallet, 0);
    }

    /**
     * @notice Updates access control contract address
     * @param _newAccesControl New access control contract address
     * @dev Only callable by owner, affects permission management
     */
    function changeAccessControl(address _newAccesControl) external onlyOwner whenNotPaused {
        zero_Address(_newAccesControl);
        accessControl = IAccessControl(_newAccesControl);
        emit systemChanged("changeAccessControl", _newAccesControl, 0);
    }

    /**
     * @notice Updates state variables contract address
     * @param _newStateVar New state variables contract address
     * @dev Only callable by owner, affects parameter retrieval
     */
    function changeStateVarAddress(address _newStateVar) external onlyOwner whenNotPaused {
        zero_Address(_newStateVar);
        stateVar = stateVariable(_newStateVar);
        emit systemChanged("changeStateVarAddress", _newStateVar, 0);
    }

    /**
     * @notice Pauses contract functionality
     * @dev Only callable by employees, prevents most state-changing functions
     */
    function pause(address caller) external onlyOwner {
        _pause();
        emit systemChanged("contract paused",caller, 0);
    }

    /**
     * @notice Unpauses contract functionality
     * @dev Only callable by employees, restores normal operation
     */
    function unpause(address caller) external onlyOwner {
        _unpause();
        emit systemChanged("contract Unpaused", caller, 0);
    }

    // =============================================================
    // FALLBACK FUNCTIONS
    // =============================================================

    /**
     * @notice Receive function - rejects all direct ETH transfers
     */
    receive() external payable {
        revert();
    }

    /**
     * @notice Fallback function - rejects all unrecognized calls
     */
    fallback() external payable {
        revert();
    }

    // =============================================================
    // UPGRADE AUTHORIZATION
    // =============================================================

    /**
     * @notice Authorizes contract upgrades
     * @param newImplementation Address of the new implementation contract
     * @dev Only callable by owner, implements UUPS upgrade pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner whenNotPaused {}
}