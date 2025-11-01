// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract stgbtbnth {
    enum st {created, done}

    struct a {
        st status;
        address owner;
    }
    a[] public sts;

    function set() external { 
        a memory m = a({
            status: st.created,
            owner: msg.sender
        });
        sts.push(m);
    }

     function seta() external { 
        a memory m = a({
            status: st.done,
            owner: msg.sender
        });
        sts.push(m);
    }

     struct Task {
        uint256 taskId;
        //TaskStatus status;
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
        //UserTask status;
        bool isPending;
        bool hasWithdrawn;
    }

    struct CancelRequest {
        address requester;
        address counterparty;
        uint256 expiry;
        //TaskRejectRequest status;
        string reason;
    }

    struct TaskSubmit {
        string githubURL;
        address sender;
        string note;
        //SubmitStatus status;
        uint8 revisionTime;
        uint256 newDeadline;
    }
}