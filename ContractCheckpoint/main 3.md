// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Logic/AccesControl.sol";
import "../Logic/onlyRegistered.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @notice Cleaned & safer refactor of TrustlessTeamProtocol focusing on core logic
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
        uint256 reward; // in wei
        uint256 deadline; // unix
        uint256 createdAt;
        uint256 creatorStake; // in wei
        uint256 memberStake; // in wei
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
    // STATE
    // ===========================
    mapping(uint256 => Task) public Tasks; // keep tasks by id; do NOT swap-pop to avoid index issues
    mapping(uint256 => JoinRequest[]) public joinRequests;
    mapping(uint256 => CancelRequest) internal CancelRequests;
    mapping(uint256 => TaskSubmit) internal TaskSubmits;
    mapping(address => uint256) public withdrawable; // pull payments

    uint256 public taskCounter;
    uint16 public cooldownInHour;
    uint256 public maxStake;
    uint256 internal feeCollected;
    uint256 public k; // algorithm constant
    address payable public systemWallet;

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
    function initialize(address _employeeAssignment, uint16 _cooldownInHour) public initializer {
        __AccessControl_init(_employeeAssignment);
        __ReentrancyGuard_init();
        __Pausable_init();
        cooldownInHour = _cooldownInHour;
        k = 1e6;
    }

    // ===========================
    // TASK LIFECYCLE
    // ===========================
    /// createTask: sender must send (reward + creatorStake)
    function createTask(
        string memory Title,
        string memory GithubURL,
        uint256 DeadlineHours,
        uint8 maximumRevision,
        uint256 RewardEther
    ) external payable whenNotPaused onlyRegistered {
        taskCounter++;
        uint256 taskId = taskCounter;

        uint256 _reward = RewardEther * 1 ether;
        // simplified creatorStake calculation (preserve original idea but protect division by zero)
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
    }

    function openRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage t = Tasks[taskId];
        require(t.status == TaskStatus.Active, "not active");
        t.status = TaskStatus.OpenRegistration;
    }

    function closeRegistration(uint256 taskId) external taskExists(taskId) onlyTaskCreator(taskId) {
        Task storage t = Tasks[taskId];
        require(t.status == TaskStatus.OpenRegistration, "not open");
        t.status = TaskStatus.Active;
    }

    // ===========================
    // JOINING
    // ===========================
    function requestJoinTask(uint256 taskId) external payable taskExists(taskId) whenNotPaused onlyRegistered {
        Task storage t = Tasks[taskId];
        if (t.status != TaskStatus.OpenRegistration) revert TaskNotOpen();
        if (msg.sender == t.creator) revert TaskNotOpen();

        // simple deterministic member stake formula (must match what creator expects)
        uint256 memberStake = (t.reward * (t.deadline + 1) * k) / (1 + (t.maxRevision + 1));

        if (msg.value != memberStake) revert InsufficientStake();

        // store request
        joinRequests[taskId].push(JoinRequest({
            applicant: msg.sender,
            stakeAmount: msg.value,
            status: UserTask.Request,
            isPending: true,
            hasWithdrawn: false
        }));
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
                // push to withdrawable to avoid reentrancy
                withdrawable[_applicant] += stake;
                found = true;
                break;
            }
        }
        require(found, "request not found");
    }

    // ===========================
    // CANCEL FLOW (request -> respond)
    // ===========================
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
    }

    function respondCancel(uint256 taskId, bool approve) external taskExists(taskId) returns (string memory) {
        Task storage t = Tasks[taskId];
        CancelRequest storage cr = CancelRequests[taskId];

        if (cr.status != TaskRejectRequest.Pending) revert NoActiveCancelRequest();
        if (msg.sender != cr.counterparty) revert NotCounterparty();

        if (block.timestamp > cr.expiry) {
            // reset
            _resetCancelRequest(taskId);
            t.status = TaskStatus.Active;
            return "expired";
        }

        if (!approve) {
            _resetCancelRequest(taskId);
            t.status = TaskStatus.Active;
            return "rejected";
        }

        // approved -> distribute using pull-pay pattern
        // if member exists, return their stake; creator gets creatorStake + reward
        if (t.member != address(0)) {
            withdrawable[t.creator] += t.creatorStake + t.reward;
            withdrawable[t.member] += t.memberStake;
        } else {
            // no member: return creator stake + reward back
            withdrawable[t.creator] += t.creatorStake + t.reward;
        }

        t.status = TaskStatus.Cancelled;
        _resetCancelRequest(taskId);

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

    // ===========================
    // FORCE CANCEL (by creator or member) - immediate but with penalties
    // ===========================
    function cancelByMe(uint256 taskId) external taskExists(taskId) nonReentrant {
        Task storage t = Tasks[taskId];
        if (msg.sender != t.creator && msg.sender != t.member) revert NotTaskMember();

        // prevent cancelling while there's an active cancel request
        if (CancelRequests[taskId].status == TaskRejectRequest.Pending) revert CancelAlreadyRequested();

        // define penalty split: when member cancels -> member stake is partially penalized to creator
        if (msg.sender == t.member) {
            // member cancels: member loses 25% of memberStake to creator; creator keeps creatorStake+reward
            uint256 penaltyToCreator = (t.memberStake * 25) / 100;
            uint256 memberReturn = (t.memberStake * 75) / 100;

            withdrawable[t.creator] += t.creatorStake + t.reward + penaltyToCreator;
            withdrawable[t.member] += memberReturn;
        } else {
            // creator cancels: creator loses 25% of creatorStake to member
            uint256 penaltyToMember = (t.creatorStake * 25) / 100;
            uint256 creatorReturn = (t.creatorStake * 75) / 100 + t.reward;

            withdrawable[t.member] += t.memberStake + penaltyToMember;
            withdrawable[t.creator] += creatorReturn;
        }

        t.status = TaskStatus.Cancelled;
        // keep task on storage but marked cancelled to avoid reindex issues
    }

    // ===========================
    // SUBMISSION FLOW
    // ===========================
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
    }

    function setMaxStake(uint256 newMaxStake) external onlyEmployes{
        require(newMaxStake > 0, "can't be 0");
        maxStake = newMaxStake;
    }

    function setAlgoConstant(uint256 newAlgoConstant) external onlyEmployes {
        require(newAlgoConstant > 0, "can't be 0");
        k = newAlgoConstant;
    }

    function withdrawToSystemWallet() external onlyEmployes {
        (bool ok, ) = systemWallet.call{value: feeCollected}("");
        require(ok, "withdraw failed");
    }
}
