// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Logic/AccesControl.sol";
import "../Logic/onlyRegistered.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract TrustlessTeamProtocol is ReentrancyGuardUpgradeable, PausableUpgradeable, AccesControl, UserAccessControl {

    // ===========================
    // ENUMS & STRUCTS
    // ===========================
    enum TaskStatus {Active, OpenRegisteration, CancelRequested, Completed, Cancelled }
    enum UserTask {Request, Accepted, Submited, Revision, Cancelled }
    enum TaskRejectRequest {None, Pending, TaskCancelled, FailedToCancelled}
    enum SubmitStatus {Checked, Revision, Accepted}

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
        uint256 CreatorStake;
        uint256 memberStake;
        uint8 maxRevision;
        bool isMemberStakeLocked;
        bool isCreatorStakeLocked;
        bool isRewardClaimed;
    }

    struct JoinRequest {
        uint256 taskId;
        UserTask status;
        address applicant;
        uint256 stakeAmount;
        bool isApproved;
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
    Task[] internal Tasks;
    mapping(uint256 => mapping(address => bool)) public hasRequestedJoin;
    mapping(uint256 => JoinRequest[]) public joinRequests;
    mapping(uint256 => CancelRequest) internal CancelRequests;
    mapping(address => uint256) public withdrawable;
    mapping(uint256 => TaskSubmit) internal TaskSubmits;
    uint256 public taskCounter;
    uint16 public cooldownInHour;
    uint256 public maxStake;
    uint256 public minStake;
    uint256 internal feeColected;
    uint256 public k = 1e6;

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
    error VotingEnded();
    error AlreadyVoted();
    error NoMembers();
    error InsufficientStake();
    error RefundFailed();
    error TaskMustHaveSingleMember();
    error NotCounterparty();

    // ===========================
    // MODIFIERS
    // ===========================
    modifier taskExists(uint256 _taskId) {
        if (_taskId == 0 || _taskId > taskCounter) revert TaskDoesNotExist();
        _;
    }

    modifier onlyTaskCreator(uint256 _taskId) {
        if (Tasks[_taskId - 1].creator != msg.sender) revert NotTaskCreator();
        _;
    }

    // ===========================
    // INITIALIZATION
    // ===========================
     function initialize(
        address _employeeAssignment,
        address _treasury,
        uint256 _memberStakePercent
    ) public initializer {
        __AccessControl_init(_employeeAssignment);
        __ReentrancyGuard_init();
        __Pausable_init();

        require(_treasury != address(0), "Invalid treasury address");
        require(_memberStakePercent <= 10000, "Invalid stake percentage");
    }

    // ===========================
    // TASK CREATION
    // ===========================
    function createTask(
        string memory Title,
        string memory GithubURL,
        uint256 Deadline,
        uint8 maximumRevision,
        uint256 Reward
    ) external payable {
        taskCounter++;
        uint256 taskId = taskCounter;

        uint256 _reward = Reward * 1 ether;
        uint256 creatorStake = (_reward * (maximumRevision + 1) * k) / ((_seeReputation(msg.sender) + 1) * (Deadline + 1));
        uint256 total = creatorStake + _reward;
        require(msg.value == total, "Stake mismatch");

        require(maximumRevision < 20, "Too many revisions");

        Task memory pt = Task({
            taskId: taskId,
            status: TaskStatus.Active,
            creator: msg.sender,
            member: address(0),
            title: Title,
            githubURL : GithubURL,
            reward: _reward,
            deadline: block.timestamp + (Deadline * 1 hours),
            createdAt: block.timestamp,
            CreatorStake: creatorStake,
            memberStake: 0,
            maxRevision: maximumRevision,
            isMemberStakeLocked: false,
            isCreatorStakeLocked: true,
            isRewardClaimed: false
        });

        Tasks.push(pt);
    }

    function closeRegistration(uint256 taskId)
        external
        taskExists(taskId)
        onlyTaskCreator(taskId)
    {
        Task storage t = Tasks[taskId - 1];
        require(t.status == TaskStatus.OpenRegisteration, "Not open for registration");
        t.status = TaskStatus.Active;
    }

    function openRegistration(uint256 taskId)
        external
        taskExists(taskId)
        onlyTaskCreator(taskId)
    {
        Task storage t = Tasks[taskId - 1];
        require(t.status == TaskStatus.Active, "Not closed yet");
        t.status = TaskStatus.OpenRegisteration;
    }


    // ===========================
    // JOIN TASK
    // ===========================
    function requestJoinTask(uint256 _taskId) external payable taskExists(_taskId) {
        Task storage t = Tasks[_taskId - 1];

        if (t.status != TaskStatus.OpenRegisteration) revert TaskNotOpen();
        if (msg.sender == t.creator) revert TaskNotOpen();
        if (hasRequestedJoin[_taskId][msg.sender]) revert AlreadyRequestedJoin();

        uint256 memberStake = (t.reward * (t.deadline + 1) * k) / 
        ((_seeReputation(msg.sender) + 1) * (_seeReputation(t.creator) + 1) * (t.maxRevision + 1));

        require(msg.value == memberStake, "mismach");

        joinRequests[_taskId].push(JoinRequest({
            taskId: _taskId,
            status: UserTask.Request,
            applicant: msg.sender,
            stakeAmount: msg.value,
            isApproved: false,
            isPending: true,
            hasWithdrawn: false
        }));
        hasRequestedJoin[_taskId][msg.sender] = true;
    }

    function approveJoinRequest(uint256 _taskId, address _applicant) external taskExists(_taskId) onlyTaskCreator(_taskId) {
        JoinRequest[] storage requests = joinRequests[_taskId];
        bool found = false;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].applicant == _applicant && requests[i].isPending) {
                requests[i].isApproved = true;
                requests[i].isPending = false;
                Tasks[_taskId - 1].member = _applicant;
                Tasks[_taskId - 1].memberStake = requests[i].stakeAmount;
                Tasks[_taskId - 1].isMemberStakeLocked = true;
                found = true;
                break;
            }
        }
        require(found, "Request not found");
    }

    function rejectJoinRequest(uint256 _taskId, address _applicant) external taskExists(_taskId) onlyTaskCreator(_taskId) {
        JoinRequest[] storage requests = joinRequests[_taskId];
        bool found = false;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].applicant == _applicant && requests[i].isPending) {
                requests[i].isPending = false;
                uint256 stake = requests[i].stakeAmount;
                requests[i].stakeAmount = 0;
                (bool ok, ) = payable(_applicant).call{value: stake}("");
                if(!ok) revert RefundFailed();
                found = true;
                break;
            }
        }
        require(found, "Request not found");
    }







function requestCancel(uint256 taskId, string calldata reason)external
{
    Task storage t = Tasks[taskId - 1];
    CancelRequest storage cr = CancelRequests[taskId - 1];

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




function respondCancel(uint256 taskId, bool approve)external returns(string memory)
{
    Task storage t = Tasks[taskId - 1];
    CancelRequest storage cr = CancelRequests[taskId - 1];
    uint256 creatorRefund = t.CreatorStake + t.reward;

    if (cr.status != TaskRejectRequest.Pending) revert NoActiveCancelRequest();
    if (msg.sender != cr.counterparty) revert NotCounterparty();

    // expired auto reset
    if (block.timestamp > cr.expiry) {
        cr.requester = address(0);
        cr.counterparty = address(0);
        cr.expiry = 0;
        cr.status = TaskRejectRequest.None;
        cr.reason = "";
        t.status = TaskStatus.Active;
        return "Voting expired, request reset";
    }

    if (!approve) {
        // reject cancel request
        cr.requester = address(0);
        cr.counterparty = address(0);
        cr.expiry = 0;
        cr.status = TaskRejectRequest.None;
        cr.reason = "";
        t.status = TaskStatus.Active;
        return "Rejected";
    } else {
        (bool asuccess, ) = t.creator.call{value: creatorRefund}("");
        require(asuccess, "transfer to loan contract failed");

        (bool bsuccess, ) = t.member.call{value: t.memberStake}("");
        require(bsuccess, "transfer to loan contract failed");

        cr.requester = address(0);
        cr.counterparty = address(0);
        cr.expiry = 0;
        cr.status = TaskRejectRequest.None;
        cr.reason = "";
        t.status = TaskStatus.Cancelled;
        Tasks[taskId - 1] = Tasks[Tasks.length -1];
        Tasks.pop();
        return "Task Cancelled";
    }
}

function cancelByMe(uint256 taskId) external {
    Task storage t = Tasks[taskId - 1];

    require(msg.sender == t.creator || msg.sender == t.member, "Not authorized");

    uint256 creatorGet;
    uint256 memberGet;

    if(msg.sender == t.member) {
        // jika member yang cancel
        creatorGet = (t.memberStake * 25) / 100 + t.CreatorStake + t.reward;
        memberGet = (t.memberStake * 75) / 100;
    } else if(msg.sender == t.creator) {
        // jika creator yang cancel
        memberGet = t.memberStake + (t.CreatorStake * 25) / 100;
        creatorGet = (t.CreatorStake * 75) / 100 + t.reward;
    }

    // transfer sesuai perhitungan
    if(creatorGet > 0) {
        payable(t.creator).transfer(creatorGet);
    }
    if(memberGet > 0) {
        payable(t.member).transfer(memberGet);
    }

    Tasks[taskId - 1] = Tasks[Tasks.length -1];
    Tasks.pop();

    // update status task jika perlu
    t.status = TaskStatus.Cancelled;
}

function requestSubmitTask(uint256 taskId, string calldata PullRequestURL, string calldata Note) external payable taskExists(taskId) {
        Task storage t = Tasks[taskId - 1];

        if (t.status != TaskStatus.OpenRegisteration) revert TaskNotOpen();
        if (msg.sender == t.creator) revert TaskNotOpen();
        if (hasRequestedJoin[taskId][msg.sender]) revert AlreadyRequestedJoin();

        TaskSubmits[taskId - 1] = (TaskSubmit({
            githubURL: PullRequestURL,
            sender: msg.sender,
            note: Note,
            status : SubmitStatus.Checked,
            revisionTime : 0, //need to changed
            newDeadline : 0
        }));
        
        if(TaskSubmits[taskId - 1].revisionTime >= t.maxRevision) {
            approveTask(taskId);
        }
         if(t.deadline <= block.timestamp ) {
            TrigerDeadline(taskId);
        }
    }

    function reSubmitTask(uint256 taskId, string calldata Note) external payable taskExists(taskId) {
        Task storage t = Tasks[taskId - 1];
        TaskSubmit storage s = TaskSubmits[taskId - 1];

        if (t.status != TaskStatus.OpenRegisteration) revert TaskNotOpen();
        if (msg.sender == t.creator) revert TaskNotOpen();
        if (hasRequestedJoin[taskId][msg.sender]) revert AlreadyRequestedJoin();

        s.note = Note;
        s.status = SubmitStatus.Revision;
        
        if(TaskSubmits[taskId - 1].revisionTime >= t.maxRevision) {
            approveTask(taskId);
        }
        if(t.deadline <= block.timestamp ) {
            TrigerDeadline(taskId);
        }
    }


    function approveTask(uint taskId) public {
        Task storage t = Tasks[taskId - 1];
        TaskSubmit storage s = TaskSubmits[taskId - 1];
        uint256 memberGet = t.reward + t.memberStake;

        (bool asuccess, ) = t.member.call{value: memberGet}("");
        require(asuccess, "transfer to loan contract failed");

        (bool bsuccess, ) = t.creator.call{value: t.CreatorStake}("");
        require(bsuccess, "transfer to loan contract failed");

        s.githubURL = "";
        s.sender = address(0);
        s.note = "";
        s.status = SubmitStatus.Accepted;
        s.revisionTime = 0;
        s.newDeadline = 0;
    }

    function revision(uint taskId, string calldata Note, uint256 newAditionalDeadline) external {
        uint8 revisionCounter;
        revisionCounter++;

        Task storage t = Tasks[taskId - 1];
        t.deadline = block.timestamp + (newAditionalDeadline * 1 hours);

        TaskSubmit storage s = TaskSubmits[taskId - 1];
        s.githubURL = "";
        s.sender = t.member;
        s.note = Note;
        s.status = SubmitStatus.Accepted;
        s.revisionTime = revisionCounter;
        s.newDeadline = t.deadline;
    }

    function TrigerDeadline(uint taskId) public {
        Task storage t = Tasks[taskId - 1];
         if(t.deadline <= block.timestamp ) {
        (bool bsuccess, ) = t.creator.call{value: (t.memberStake * 25) / 100}("");
        require(bsuccess, "transfer to loan contract failed");

        (bool asuccess, ) = t.member.call{value: (t.memberStake * 75) / 100}("");
        require(asuccess, "transfer to loan contract failed");
        }
        t.member = address(0);
        t.deadline = 0;
    }

    /*   

    struct TaskSubmit {
        string githubURL;
        address sender;
        string note;
    }
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
        uint256 CreatorStake;
        uint256 memberStake;
        uint8 maxRevision;
        bool isMemberStakeLocked;
        bool isCreatorStakeLocked;
        bool isRewardClaimed;
    }
    */
/*
struct JoinRequest {
        uint256 taskId;
        UserTask status;
        address applicant;
        uint256 stakeAmount;
        bool isApproved;
        bool isPending;
        bool hasWithdrawn;
    }
    // ===========================
    // CANCEL REQUEST
    // ===========================
    function requestRejectLoan(uint256 taskId, string calldata Reason) external {
        CancelRequest storage cr = CancelRequests[taskId - 1];

        if (cr.status == TaskStatus.CancelRequested) revert CancelAlreadyRequested();

        // reset previous if expired
        if (cr.cooldown != 0 && block.timestamp > cr.cooldown) {
            cr.approvals = 0;
            cr.rejections = 0;
            cr.requester = address(0);
            cr.cooldown = 0;
            cr.requestStatus = TaskRejectRequest.None;
            cr.status = TaskStatus.Active;
        }

        cr.requester = msg.sender;
        cr.cooldown = block.timestamp +(cooldownInHour * 1 hours);
        cr.approvals = 0;
        cr.rejections = 0;
        cr.status = TaskStatus.CancelRequested;
        cr.requestStatus = TaskRejectRequest.Vote;
        cr.reason = Reason;
    }

    function voteRejectLoan(uint256 taskId, bool approve) external nonReentrant returns (string memory) {
        Task storage t = Tasks[taskId - 1];
        CancelRequest storage cr = CancelRequests[taskId - 1];
        JoinRequest[] storage members = joinRequests[taskId];

        if (cr.status != TaskStatus.CancelRequested) revert NoActiveCancelRequest();

        if (block.timestamp > cr.cooldown) {
            // reset expired
            cr.approvals = 0;
            cr.rejections = 0;
            cr.requester = address(0);
            cr.cooldown = 0;
            cr.requestStatus = TaskRejectRequest.None;
            cr.status = TaskStatus.Active;
            cr.reason = "";
            t.status = TaskStatus.Active;
            return "Voting expired, request reset";
        }

        if (cr.hasVoted[msg.sender]) revert AlreadyVoted();
        cr.hasVoted[msg.sender] = true;

        if (approve) {
            cr.approvals++;
        } else {
            cr.rejections++;
        }

        uint256 totalMembers = t.member.length;
        if (totalMembers == 0) revert NoMembers();

        // majority approvals
        if (cr.approvals * 2 > totalMembers) {
            cr.status = TaskStatus.Cancelled;
            cr.requestStatus = TaskRejectRequest.TaskCancelled;
            t.status = TaskStatus.Cancelled;

            // refund creator
            uint256 creatorStake = t.CreatorStake;
            t.CreatorStake = 0;
            (bool ok, ) = payable(t.creator).call{value: creatorStake}("");
            if(!ok) revert RefundFailed();

            // refund members (pull pattern)
            for (uint256 i = 0; i < members.length; i++) {
                if (members[i].isApproved && !members[i].hasWithdrawn && members[i].stakeAmount > 0) {
                    uint256 stake = members[i].stakeAmount;
                    members[i].stakeAmount = 0;
                    members[i].hasWithdrawn = true;
                    (bool mOk, ) = payable(members[i].applicant).call{value: stake}("");
                    if(!mOk) revert RefundFailed();
                }
            }

            // cleanup cancel request
            cr.approvals = 0;
            cr.rejections = 0;
            cr.requester = address(0);
            cr.cooldown = 0;
            cr.requestStatus = TaskRejectRequest.None;
            cr.reason = "";

            return "Task Cancelled";
        }

        // majority rejections
        if (cr.rejections * 2 >= totalMembers) {
            cr.status = TaskStatus.Active;
            cr.requestStatus = TaskRejectRequest.FailedToCancelled;
            t.status = TaskStatus.Active;

            // reset
            cr.approvals = 0;
            cr.rejections = 0;
            cr.requester = address(0);
            cr.cooldown = 0;
            cr.requestStatus = TaskRejectRequest.None;
            cr.reason = "";

            return "Task Not Cancelled";
        }

        return "Vote recorded";
    }*/
}
