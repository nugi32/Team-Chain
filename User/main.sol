// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Logic/AccesControl.sol";
import "../Logic/onlyRegistered.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @title TrustlessTeamProtocol v2
/// @notice Cleaned & safer refactor of TrustlessTeamProtocol focusing on core logic
/// @dev Pull-pay pattern, task lifecycle, submission, cancel logic, and revision handling implemented
contract TrustlessTeamProtocol is ReentrancyGuardUpgradeable, PausableUpgradeable, AccesControl, UserAccessControl {

    // ===========================
    // ENUMS & STRUCTS
    // ===========================
    enum TaskStatus { NonExistent, Active, OpenRegistration, CancelRequested, Completed, Cancelled }
    enum UserTask { None, Request, Accepted, Submitted, Revision, Cancelled }
    enum TaskRejectRequest { None, Pending }
    enum SubmitStatus { NoneStatus, Pending, RevisionNeeded, Accepted }

    struct Task {
        uint256 taskId;
        TaskStatus status;
        address creator;
        address member;
        string title;
        string githubURL;
        uint256 reward;
        uint256 deadline;
        uint256 createdAt;
        uint256 creatorStake;
        uint256 memberStake;
        uint8 maxRevision;
        bool isMemberStakeLocked;
        bool isCreatorStakeLocked;
        bool isRewardClaimed;
        bool exists;
    }

    struct JoinRequest {
        address applicant;
        uint256 stakeAmount;
        UserTask status;
        bool isPending;
        bool hasWithdrawn;
    }

    struct CancelRequest {
        address requester;
        address counterparty;
        uint256 expiry;
        TaskRejectRequest status;
        string reason;
    }

    struct TaskSubmit {
        string githubURL;
        address sender;
        string note;
        SubmitStatus status;
        uint8 revisionTime;
        uint256 newDeadline;
    }

    // ===========================
    // STATE VARIABLES
    // ===========================
    mapping(uint256 => Task) public Tasks;
    mapping(uint256 => JoinRequest[]) public joinRequests;
    mapping(uint256 => CancelRequest) internal CancelRequests;
    mapping(uint256 => TaskSubmit) internal TaskSubmits;
    mapping(address => uint256) public withdrawable;

    uint256 public taskCounter;
    uint16 public cooldownInHour;
    uint256 public maxStake;
    uint256 internal feeCollected;
    uint256 public k;
    address payable public systemWallet;

    // ===========================
    // EVENTS
    // ===========================
    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, uint256 creatorStake);
    event RegistrationOpened(uint256 indexed taskId);
    event RegistrationClosed(uint256 indexed taskId);
    event JoinRequested(uint256 indexed taskId, address indexed applicant, uint256 stakeAmount);
    event JoinApproved(uint256 indexed taskId, address indexed applicant);
    event JoinRejected(uint256 indexed taskId, address indexed applicant);
    event CancelRequestedEvent(uint256 indexed taskId, address indexed requester, string reason);
    event CancelResponded(uint256 indexed taskId, bool approved);
    event TaskCancelledByMe(uint256 indexed taskId, address indexed initiator);
    event TaskSubmitted(uint256 indexed taskId, address indexed member, string githubURL);
    event TaskReSubmitted(uint256 indexed taskId, address indexed member);
    event TaskApproved(uint256 indexed taskId);
    event RevisionRequested(uint256 indexed taskId, uint8 revisionCount, uint256 newDeadline);
    event DeadlineTriggered(uint256 indexed taskId);
    event Withdrawal(address indexed user, uint256 amount);
    event cooldownInHourChanged(uint16 indexed newcooldownInHour);
    event maxStakeChanged(uint256 indexed newmaxStake);
    event kChanged(uint256 newK);
    event newsystemWallet(address indexed NewsystemWallet);

    // ===========================
    // ERRORS
    // ===========================
    error TaskDoesNotExist();
    error NotTaskCreator();
    error NotTaskMember();
    error AlreadyRequestedJoin();
    error TaskNotOpen();
    error CancelAlreadyRequested();
    error NoActiveCancelRequest();
    error NotCounterparty();
    error InsufficientStake();

    // ===========================
    // MODIFIERS
    // ===========================
    modifier taskExists(uint256 _taskId) {
        if (!Tasks[_taskId].exists) revert TaskDoesNotExist();
        _;
    }

    modifier onlyTaskCreator(uint256 _taskId) {
        if (Tasks[_taskId].creator != msg.sender) revert NotTaskCreator();
        _;
    }

    // ===========================
    // INITIALIZER
    // ===========================
    function initialize(address _employeeAssignment, uint16 _cooldownInHour, uint256 _maxStake, address payable _systemWallet, address _userRegistry) public initializer onlyOwner callerZeroAddr {
        zero_Address(_systemWallet);
        zero_Address(_employeeAssignment);
        zero_Address(_userRegistry);
        __AccessControl_init(_employeeAssignment);
        __UserAccessControl_init(_userRegistry);
        systemWallet = _systemWallet;
        __ReentrancyGuard_init();
        __Pausable_init();
        cooldownInHour = _cooldownInHour;
        k = 1e6;
        taskCounter = 0;
        maxStake = _maxStake;
    }

    // ===========================
    // TASK LIFECYCLE FUNCTIONS
    // ===========================
    function createTask(string memory Title, string memory GithubURL, uint256 DeadlineHours, uint8 maximumRevision, uint256 RewardEther) external payable whenNotPaused onlyRegistered onlyUser callerZeroAddr{
        taskCounter++;
        uint256 taskId = taskCounter;
        uint256 _reward = RewardEther * 1 ether;
        uint256 creatorStake = (_reward * (uint256(maximumRevision) + 1) * k) / (1 + (DeadlineHours + 1));
        uint256 total = _reward + creatorStake;
        if (msg.value != total) revert InsufficientStake();

        Tasks[taskId] = Task({
            taskId: taskId,
            status: TaskStatus.Active,
            creator: msg.sender,
            member: address(0),
            title: Title,
            githubURL: GithubURL,
            reward: _reward,
            deadline: block.timestamp + (DeadlineHours * 1 hours),
            createdAt: block.timestamp,
            creatorStake: creatorStake,
            memberStake: 0,
            maxRevision: maximumRevision,
            isMemberStakeLocked: false,
            isCreatorStakeLocked: true,
            isRewardClaimed: false,
            exists: true
        });

        emit TaskCreated(taskId, msg.sender, _reward, creatorStake);
    }

    function openRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage t = Tasks[taskId];
        require(t.status == TaskStatus.Active, "not active");
        t.status = TaskStatus.OpenRegistration;
        emit RegistrationOpened(taskId);
    }

    function closeRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage t = Tasks[taskId];
        require(t.status == TaskStatus.OpenRegistration, "not open");
        t.status = TaskStatus.Active;
        emit RegistrationClosed(taskId);
    }

    function requestJoinTask(uint256 taskId) external payable taskExists(taskId) whenNotPaused onlyRegistered onlyUser callerZeroAddr{
        Task storage t = Tasks[taskId];
        if (t.status != TaskStatus.OpenRegistration) revert TaskNotOpen();
        if (msg.sender == t.creator) revert TaskNotOpen();
        uint256 memberStake = (t.reward * (t.deadline + 1) * k) / (1 + (t.maxRevision + 1));
        if (msg.value != memberStake) revert InsufficientStake();
        joinRequests[taskId].push(JoinRequest({
            applicant: msg.sender,
            stakeAmount: msg.value,
            status: UserTask.Request,
            isPending: true,
            hasWithdrawn: false
        }));
        emit JoinRequested(taskId, msg.sender, msg.value);
    }

    function approveJoinRequest(uint256 taskId, address _applicant) external taskExists(taskId) onlyTaskCreator(taskId) whenNotPaused {
        JoinRequest[] storage requests = joinRequests[taskId];
        bool found = false;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].applicant == _applicant && requests[i].isPending) {
                requests[i].isPending = false;
                requests[i].status = UserTask.Accepted;
                Task storage t = Tasks[taskId];
                t.member = _applicant;
                t.memberStake = requests[i].stakeAmount;
                t.isMemberStakeLocked = true;
                found = true;
                break;
            }
        }
        require(found, "request not found");
        emit JoinApproved(taskId, _applicant);
    }

    function rejectJoinRequest(uint256 taskId, address _applicant) external taskExists(taskId) onlyTaskCreator(taskId) whenNotPaused {
        JoinRequest[] storage requests = joinRequests[taskId];
        bool found = false;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].applicant == _applicant && requests[i].isPending) {
                requests[i].isPending = false;
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

    function requestCancel(uint256 taskId, string calldata reason) external taskExists(taskId) {
        Task storage t = Tasks[taskId];
        CancelRequest storage cr = CancelRequests[taskId];
        if (cr.status == TaskRejectRequest.Pending) revert CancelAlreadyRequested();
        if (msg.sender != t.creator && msg.sender != t.member) revert NotTaskMember();
        address counterparty = (msg.sender == t.creator) ? t.member : t.creator;
        cr.requester = msg.sender;
        cr.counterparty = counterparty;
        cr.expiry = block.timestamp + (cooldownInHour * 1 hours);
        cr.status = TaskRejectRequest.Pending;
        cr.reason = reason;
        t.status = TaskStatus.CancelRequested;
        emit CancelRequestedEvent(taskId, msg.sender, reason);
    }

    function respondCancel(uint256 taskId, bool approve) external taskExists(taskId) returns (string memory) {
        Task storage t = Tasks[taskId];
        CancelRequest storage cr = CancelRequests[taskId];
        if (cr.status != TaskRejectRequest.Pending) revert NoActiveCancelRequest();
        if (msg.sender != cr.counterparty) revert NotCounterparty();

        if (block.timestamp > cr.expiry) {
            _resetCancelRequest(taskId);
            t.status = TaskStatus.Active;
            emit CancelResponded(taskId, false);
            return "expired";
        }

        if (!approve) {
            _resetCancelRequest(taskId);
            t.status = TaskStatus.Active;
            emit CancelResponded(taskId, false);
            return "rejected";
        }

        if (t.member != address(0)) {
            withdrawable[t.creator] += t.creatorStake + t.reward;
            withdrawable[t.member] += t.memberStake;
        } else {
            withdrawable[t.creator] += t.creatorStake + t.reward;
        }
        t.status = TaskStatus.Cancelled;
        _resetCancelRequest(taskId);
        emit CancelResponded(taskId, true);
        return "cancelled";
    }

    function _resetCancelRequest(uint256 taskId) internal {
        CancelRequest storage cr = CancelRequests[taskId];
        cr.requester = address(0);
        cr.counterparty = address(0);
        cr.expiry = 0;
        cr.status = TaskRejectRequest.None;
        cr.reason = "";
    }

    function cancelByMe(uint256 taskId) external taskExists(taskId) nonReentrant {
        Task storage t = Tasks[taskId];
        if (msg.sender != t.creator && msg.sender != t.member) revert NotTaskMember();
        if (CancelRequests[taskId].status == TaskRejectRequest.Pending) revert CancelAlreadyRequested();

        if (msg.sender == t.member) {
            uint256 penaltyToCreator = (t.memberStake * 25) / 100;
            uint256 memberReturn = (t.memberStake * 75) / 100;
            withdrawable[t.creator] += t.creatorStake + t.reward + penaltyToCreator;
            withdrawable[t.member] += memberReturn;
        } else {
            uint256 penaltyToMember = (t.creatorStake * 25) / 100;
            uint256 creatorReturn = (t.creatorStake * 75) / 100 + t.reward;
            withdrawable[t.member] += t.memberStake + penaltyToMember;
            withdrawable[t.creator] += creatorReturn;
        }

        t.status = TaskStatus.Cancelled;
        emit TaskCancelledByMe(taskId, msg.sender);
    }

    function requestSubmitTask(uint256 taskId, string calldata PullRequestURL, string calldata Note) external taskExists(taskId) {
        Task storage t = Tasks[taskId];
        require(t.status == TaskStatus.Active, "task not active");
        require(msg.sender == t.member, "only member");
        TaskSubmits[taskId] = TaskSubmit({
            githubURL: PullRequestURL,
            sender: msg.sender,
            note: Note,
            status: SubmitStatus.Pending,
            revisionTime: 0,
            newDeadline: t.deadline
        });
        emit TaskSubmitted(taskId, msg.sender, PullRequestURL);
    }

    function reSubmitTask(uint256 taskId, string calldata Note) external taskExists(taskId) {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];
        require(msg.sender == t.member, "only member");
        require(s.status == SubmitStatus.RevisionNeeded, "not in revision");

        s.note = Note;
        s.status = SubmitStatus.Pending;

        if (s.revisionTime > t.maxRevision) {
            // too many revisions -> auto approve
            approveTask(taskId);
        }
        emit TaskReSubmitted(taskId, msg.sender);
    }

    function approveTask(uint256 taskId) public taskExists(taskId) nonReentrant {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];

        require(t.status == TaskStatus.Active, "invalid status");
        require(!t.isRewardClaimed, "already claimed");

        uint256 memberGet = t.reward + t.memberStake;
        uint256 creatorGet = t.creatorStake;

        withdrawable[t.member] += memberGet;
        withdrawable[t.creator] += creatorGet;

        t.isRewardClaimed = true;
        t.status = TaskStatus.Completed;

        // clear submit
        s.githubURL = "";
        s.sender = address(0);
        s.note = "";
        s.status = SubmitStatus.Accepted;
        s.revisionTime = 0;
        s.newDeadline = 0;

        emit TaskApproved(taskId);
    }

    function requestRevision(uint256 taskId, string calldata Note, uint256 additionalDeadlineHours) external taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage t = Tasks[taskId];
        TaskSubmit storage s = TaskSubmits[taskId];
        require(s.sender == t.member, "no submission");
        require(s.status == SubmitStatus.Pending, "not pending");

        s.status = SubmitStatus.RevisionNeeded;
        s.note = Note;
        s.revisionTime++;
        t.deadline = block.timestamp + (additionalDeadlineHours * 1 hours);

        if (s.revisionTime > t.maxRevision) {
            // too many revisions -> auto approve
            approveTask(taskId);
        }
        emit RevisionRequested(taskId, s.revisionTime, t.deadline);
    }

    // ===========================
    // DEADLINE TRIGGER
    // ===========================
    function triggerDeadline(uint256 taskId) public taskExists(taskId) {
        Task storage t = Tasks[taskId];
        if (t.deadline == 0) return;
        if (block.timestamp < t.deadline) return;

        // handle late/expired: split memberStake (75/25) and creator keeps creatorStake?
        if (t.member != address(0) && t.memberStake > 0) {
            uint256 toMember = (t.memberStake * 75) / 100;
            uint256 toCreator = (t.memberStake * 25) / 100;

            withdrawable[t.member] += toMember;
            withdrawable[t.creator] += toCreator + t.creatorStake + t.reward; // decide to return creator funds
        } else {
            // no member: return creator stake + reward
            withdrawable[t.creator] += t.creatorStake + t.reward;
        }

        t.status = TaskStatus.Cancelled;

        emit DeadlineTriggered(taskId);
    }

    // ===========================
    // PULL PAYMENTS
    // ===========================
    function withdraw() external nonReentrant onlyRegistered {
        uint256 amount = withdrawable[msg.sender];
        require(amount > 0, "no funds");
        withdrawable[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "withdraw failed");

        emit Withdrawal(msg.sender, amount);
    }

    // ===========================
    // READ HELPERS
    // ===========================
    function getJoinRequests(uint256 taskId) external view onlyRegistered returns (JoinRequest[] memory) {
        return joinRequests[taskId];
    }

    function getTaskSubmit(uint256 taskId) external view onlyRegistered returns (TaskSubmit memory) {
        return TaskSubmits[taskId];
    }

    // Fallback/receive to prevent accidental ETH
    receive() external payable {
        revert();
    }

    fallback() external payable {
        revert();
    }

//=============================================================================================================================================

    function setCooldownHour(uint16 newCooldown) external onlyEmployes{
        require(newCooldown > 0, "can't be 0");
        cooldownInHour = newCooldown;
        emit cooldownInHourChanged(newCooldown);
    }

    function setMaxStake(uint256 newMaxStake) external onlyEmployes{
        require(newMaxStake > 0, "can't be 0");
        maxStake = newMaxStake;
        emit maxStakeChanged(newMaxStake);
    }

    function setAlgoConstant(uint256 newAlgoConstant) external onlyEmployes {
        require(newAlgoConstant > 0, "can't be 0");
        k = newAlgoConstant;
        emit kChanged(newAlgoConstant);
    }

    function withdrawToSystemWallet() external onlyEmployes {
        (bool ok, ) = systemWallet.call{value: feeCollected}("");
        require(ok, "withdraw failed");
    }

    function changeSystemwallet(address payable _NewsystemWallet) external onlyEmployes {
        zero_Address(_NewsystemWallet);
        systemWallet = _NewsystemWallet;
        emit newsystemWallet(_NewsystemWallet);
    }
}