
/*


// ===========================
    // EVENTS
    // ===========================
    
    /// @notice Emitted when a user registers
    event UserRegistered(address indexed user, string name, uint age);
    
    /// @notice Emitted when reputation is updated
    event ReputationUpdated(address indexed user, int256 newReputation, int256 change);
    
    /// @notice Emitted when a task is created
    event TaskCreated(
        uint256 indexed taskId,
        TaskMode mode,
        address indexed creator,
        address indexed leader,
        address member,
        address observer,
        uint256 reward,
        uint256 deadline
    );
    
    /// @notice Emitted when a task is accepted
    event TaskAccepted(uint256 indexed taskId, address indexed member, uint256 stakeAmount);
    
    /// @notice Emitted when a task is submitted
    event TaskSubmitted(uint256 indexed taskId, address indexed member, string resultCID);
    
    /// @notice Emitted when a task is approved
    event TaskApproved(uint256 indexed taskId, address indexed reviewer);
    
    /// @notice Emitted when a revision is requested
    event TaskRevised(
        uint256 indexed taskId,
        address indexed reviewer,
        uint256 newDeadline,
        uint256 leaderPenalty,
        uint256 memberPenalty
    );
    
    /// @notice Emitted when a task is completed
    event TaskCompleted(uint256 indexed taskId, address indexed member, uint256 reward);
    
    /// @notice Emitted when a task deadline is missed
    event TaskMissed(uint256 indexed taskId, uint256 burnedAmount, uint256 penaltyAmount);
    
    /// @notice Emitted when a task is cancelled
    event TaskCancelled(uint256 indexed taskId, address indexed observer);
    
    /// @notice Emitted when leader stake is liquidated
    event LeaderLiquidated(address indexed leader, uint256 liquidatedAmount, int256 reputationChange);
    
    /// @notice Emitted when stake is locked
    event StakeLocked(address indexed user, uint256 amount, uint256 indexed taskId);
    
    /// @notice Emitted when stake is unlocked/returned
    event StakeReturned(address indexed user, uint256 amount, uint256 indexed taskId);
    





   /*
    
    /// @notice Calculate required stake for leader based on reputation
    /// @param _leader Leader address
    /// @return Required stake amount
    function calculateLeaderStake(address _leader) public view returns (uint256) {
        int256 rep = users[_leader].reputation;
        // baseStake * (1 + rep / 100)
        // For negative reputation, this could be problematic, so we cap it
        if (rep < 0) {
            return baseStake;
        }
        return baseStake + (baseStake * uint256(rep) / 100);
    }
    
    // ===========================
    // TASK ACCEPTANCE
    // ===========================
    
    /// @notice Accept a task (Member function)
    /// @param _taskId Task ID to accept
    function acceptTask(uint256 _taskId) external payable 
        taskExists(_taskId) 
        validTaskStatus(_taskId, TaskStatus.Created)
        whenNotPaused 
        onlyRegistered 
        nonReentrant 
    {
        Task storage task = tasks[_taskId];
        
        // Validate acceptance eligibility
        if (task.mode == TaskMode.Private) {
            require(msg.sender == task.member, "Not assigned member");
        }
        // Public mode: anyone can accept
        
        // Calculate member stake (10% of reward by default)
        uint256 requiredMemberStake = (task.reward * memberStakePercent) / 10000;
        require(msg.value >= requiredMemberStake, "Insufficient member stake");
        
        // Update task
        task.member = msg.sender;
        task.status = TaskStatus.Accepted;
        task.memberStake = requiredMemberStake;
        task.isMemberStakeLocked = true;
        
        // Update user stats
        users[msg.sender].totalStaked += requiredMemberStake;
        updateReputation(msg.sender, 1); // +1 reputation for accepting
        
        emit StakeLocked(msg.sender, requiredMemberStake, _taskId);
        emit TaskAccepted(_taskId, msg.sender, requiredMemberStake);
    }
    
    // ===========================
    // TASK SUBMISSION
    // ===========================
    
    /// @notice Submit task results
    /// @param _taskId Task ID
    /// @param _resultCID IPFS CID of the result
    function submitTask(uint256 _taskId, string memory _resultCID) external 
        taskExists(_taskId)
        validTaskStatus(_taskId, TaskStatus.Accepted)
        whenNotPaused
        onlyRegistered
    {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.member, "Only assigned member can submit");
        require(bytes(_resultCID).length > 0, "Invalid result CID");
        
        task.status = TaskStatus.Submitted;
        task.submittedAt = block.timestamp;
        task.resultCID = _resultCID;
        
        emit TaskSubmitted(_taskId, msg.sender, _resultCID);
    }
    
    // ===========================
    // TASK REVIEW & APPROVAL
    // ===========================
    
    /// @notice Approve task completion
    /// @param _taskId Task ID to approve
    function approveTask(uint256 _taskId) external 
        taskExists(_taskId)
        whenNotPaused
        nonReentrant
    {
        Task storage task = tasks[_taskId];
        
        // Determine reviewer based on mode
        if (task.mode == TaskMode.Public) {
            require(msg.sender == task.leader, "Only leader can approve in public mode");
        } else {
            require(msg.sender == task.observer, "Only observer can approve in private mode");
        }
        
        require(
            task.status == TaskStatus.Submitted || task.status == TaskStatus.Revision,
            "Task not in reviewable status"
        );
        
        // Process approval
        _completeTask(_taskId, true);
        
        emit TaskApproved(_taskId, msg.sender);
    }
    
    /// @notice Request revision on submitted task
    /// @param _taskId Task ID
    /// @param _newDeadline New deadline timestamp
    function requestRevision(uint256 _taskId, uint256 _newDeadline) external 
        taskExists(_taskId)
        whenNotPaused
        nonReentrant
    {
        Task storage task = tasks[_taskId];
        
        // Only reviewer can request revision
        if (task.mode == TaskMode.Public) {
            require(msg.sender == task.leader, "Only leader can request revision");
        } else {
            require(msg.sender == task.observer, "Only observer can request revision");
        }
        
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(_newDeadline > block.timestamp, "Invalid new deadline");
        
        // Apply shared penalties
        uint256 leaderPenalty = (task.leaderStake * 2) / 100; // 2% leader penalty
        uint256 memberPenalty = (task.memberStake * 1) / 100; // 1% member penalty
        
        // Update stakes
        task.leaderStake -= leaderPenalty;
        task.memberStake -= memberPenalty;
        
        // Update reputation
        updateReputation(task.leader, -0.5 ether); // -0.5 reputation
        updateReputation(task.member, -1 ether); // -1 reputation
        
        // Update task
        task.status = TaskStatus.Revision;
        task.deadline = _newDeadline;
        
        // Send penalties to treasury
        (bool success, ) = treasury.call{value: leaderPenalty + memberPenalty}("");
        require(success, "Penalty transfer failed");
        
        emit TaskRevised(_taskId, msg.sender, _newDeadline, leaderPenalty, memberPenalty);
    }
    
    /// @notice Cancel task (Private mode only)
    /// @param _taskId Task ID to cancel
    function cancelTask(uint256 _taskId) external 
        taskExists(_taskId)
        whenNotPaused
        nonReentrant
    {
        Task storage task = tasks[_taskId];
        require(task.mode == TaskMode.Private, "Only private tasks can be cancelled");
        require(msg.sender == task.observer, "Only observer can cancel");
        require(task.status != TaskStatus.Completed, "Cannot cancel completed task");
        
        // Return all stakes
        if (task.isLeaderStakeLocked && task.leaderStake > 0) {
            users[task.leader].totalStaked -= task.leaderStake;
            (bool success1, ) = payable(task.leader).call{value: task.leaderStake}("");
            require(success1, "Leader refund failed");
            emit StakeReturned(task.leader, task.leaderStake, _taskId);
        }
        
        if (task.isMemberStakeLocked && task.memberStake > 0) {
            users[task.member].totalStaked -= task.memberStake;
            (bool success2, ) = payable(task.member).call{value: task.memberStake}("");
            require(success2, "Member refund failed");
            emit StakeReturned(task.member, task.memberStake, _taskId);
        }
        
        // Update reputation
        updateReputation(task.leader, -0.5 ether);
        updateReputation(task.member, -0.5 ether);
        
        task.status = TaskStatus.Cancelled;
        
        emit TaskCancelled(_taskId, msg.sender);
    }
    
    // ===========================
    // DEADLINE & LIQUIDATION
    // ===========================
    
    /// @notice Check deadline and apply penalties if missed
    /// @param _taskId Task ID to check
    function checkDeadline(uint256 _taskId) external 
        taskExists(_taskId)
        whenNotPaused
        nonReentrant
    {
        Task storage task = tasks[_taskId];
        require(block.timestamp > task.deadline, "Deadline not reached");
        require(
            task.status == TaskStatus.Accepted || 
            task.status == TaskStatus.Submitted || 
            task.status == TaskStatus.Revision,
            "Invalid status for deadline check"
        );
        
        // Apply missed deadline penalties
        uint256 burnedAmount = task.memberStake; // Burn member stake (100%)
        uint256 penaltyAmount = (task.leaderStake * 30) / 100; // 30% leader penalty
        
        // Update stakes
        task.leaderStake -= penaltyAmount;
        
        // Update reputation
        updateReputation(task.member, -3 ether); // -3 reputation
        updateReputation(task.leader, -1 ether); // -1 reputation
        
        // Update task status
        task.status = TaskStatus.Missed;
        
        // Burn member stake and send leader penalty to treasury
        (bool success, ) = treasury.call{value: penaltyAmount}("");
        require(success, "Penalty transfer failed");
        
        // Update user stats
        users[task.member].totalStaked -= burnedAmount;
        users[task.member].totalTasksFailed++;
        users[task.leader].totalStaked -= penaltyAmount;
        
        // Update leader staked amount
        users[task.leader].totalStaked -= penaltyAmount;
        
        // Check for cascading liquidation
        _checkCascadingLiquidation(task.leader);
        
        emit TaskMissed(_taskId, burnedAmount, penaltyAmount);
    }
    
    /// @notice Check if leader should be liquidated (>50% failure rate)
    /// @param _leader Leader address to check
    function _checkCascadingLiquidation(address _leader) internal {
        User storage leader = users[_leader];
        
        uint256 totalTasks = leader.totalTasksCompleted + leader.totalTasksFailed;
        if (totalTasks < 10) return; // Need at least 10 tasks for liquidation check
        
        uint256 failureRate = (leader.totalTasksFailed * 100) / totalTasks;
        
        if (failureRate > 50) {
            // Liquidate all active stakes
            uint256 liquidatedAmount = leader.totalStaked;
            
            if (liquidatedAmount > 0) {
                // Send to treasury
                (bool success, ) = treasury.call{value: liquidatedAmount}("");
                require(success, "Liquidation transfer failed");
                
                leader.totalStaked = 0;
                updateReputation(_leader, -10 ether); // -10 reputation
                
                emit LeaderLiquidated(_leader, liquidatedAmount, -10 ether);
            }
        }
    }
    
    // ===========================
    // AUTO-APPROVAL (Grace Period)
    // ===========================
    
    /// @notice Auto-approve task after grace period
    /// @param _taskId Task ID
    function autoApprove(uint256 _taskId) external 
        taskExists(_taskId)
        whenNotPaused
        nonReentrant
    {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(block.timestamp >= task.submittedAt + gracePeriod, "Grace period not expired");
        
        _completeTask(_taskId, true);
    }
    
    // ===========================
    // INTERNAL HELPERS
    // ===========================
    
    /// @notice Complete task and distribute rewards
    /// @param _taskId Task ID
    /// @param _success Whether task was successful
    function _completeTask(uint256 _taskId, bool _success) internal {
        Task storage task = tasks[_taskId];
        
        if (_success) {
            // Return stakes
            if (task.isLeaderStakeLocked && task.leaderStake > 0) {
                users[task.leader].totalStaked -= task.leaderStake;
                (bool success1, ) = payable(task.leader).call{value: task.leaderStake}("");
                require(success1, "Leader stake return failed");
                emit StakeReturned(task.leader, task.leaderStake, _taskId);
            }
            
            if (task.isMemberStakeLocked && task.memberStake > 0) {
                users[task.member].totalStaked -= task.memberStake;
                (bool success2, ) = payable(task.member).call{value: task.memberStake}("");
                require(success2, "Member stake return failed");
                emit StakeReturned(task.member, task.memberStake, _taskId);
            }
            
            // Distribute reward to member
            (bool success3, ) = payable(task.member).call{value: task.reward}("");
            require(success3, "Reward transfer failed");
            
            // Update reputation
            updateReputation(task.leader, 1 ether); // +1 reputation
            updateReputation(task.member, 3 ether); // +3 reputation
            
            // Update stats
            users[task.member].totalTasksCompleted++;
            users[task.leader].totalTasksCompleted++;
            
            task.status = TaskStatus.Completed;
            
            emit TaskCompleted(_taskId, task.member, task.reward);
        }
    }
    
    /// @notice Update user reputation
    /// @param _user User address
    /// @param _change Reputation change amount
    function updateReputation(address _user, int256 _change) internal {
        users[_user].reputation += _change;
        emit ReputationUpdated(_user, users[_user].reputation, _change);
    }
    
    // ===========================
    // VIEW FUNCTIONS
    // ===========================
    
    /// @notice Get user information
    /// @param _user User address
    /// @return User struct
    function getUser(address _user) external view returns (User memory) {
        return users[_user];
    }
    
    /// @notice Get task information
    /// @param _taskId Task ID
    /// @return Task struct
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
    
    /// @notice Check if task is in grace period
    /// @param _taskId Task ID
    /// @return Whether grace period is active
    function isInGracePeriod(uint256 _taskId) external view returns (bool) {
        Task memory task = tasks[_taskId];
        if (task.submittedAt == 0) return false;
        return block.timestamp < task.submittedAt + gracePeriod;
    }
    
    // Array to store all task IDs for enumeration
    uint256[] public allTasks;
    
    /// @notice Get total number of tasks
    /// @return Total task count
    function getTotalTasks() external view returns (uint256) {
        return allTasks.length;
    }
    
    // ===========================
    // ADMIN FUNCTIONS
    // ===========================
    
    /// @notice Update treasury address (only owner)
    /// @param _newTreasury New treasury address
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid address");
        treasury = _newTreasury;
    }
    
    /// @notice Update base stake amount (only owner)
    /// @param _newBaseStake New base stake amount
    function setBaseStake(uint256 _newBaseStake) external onlyOwner {
        baseStake = _newBaseStake;
    }
    
    /// @notice Update member stake percentage (only owner)
    /// @param _newPercent New percentage (basis points)
    function setMemberStakePercent(uint256 _newPercent) external onlyOwner {
        require(_newPercent <= 10000, "Invalid percentage");
        memberStakePercent = _newPercent;
    }
    
    /// @notice Update grace period (only owner)
    /// @param _newGracePeriod New grace period in seconds
    function setGracePeriod(uint256 _newGracePeriod) external onlyOwner {
        gracePeriod = _newGracePeriod;
    }
    
    /// @notice Pause contract (only owner)
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract (only owner)
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Emergency withdraw (only owner)
    /// @param _amount Amount to withdraw
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        //(bool success, ) = payable(owner()).call{value: _amount}("");
        //require(success, "Withdraw failed");
    }*/