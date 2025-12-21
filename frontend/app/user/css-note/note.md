<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../global/global.css" />
    <link rel="stylesheet" href="./task.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js"></script>
    <script type="module" src="../global/connectwallet.js"></script>
    <script type="module" src="../global/sidebar.js"></script>
    <style>
        /* Overlay Styles */
        .form-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .form-overlay.visible {
            display: flex;
            opacity: 1;
        }

        .form-container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            transition: transform 0.3s ease;
            position: relative;
        }

        .form-overlay.visible .form-container {
            transform: translateY(0);
        }

        .close-form-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }

        .close-form-btn:hover {
            background-color: #f0f0f0;
            color: #333;
        }

        /* Form Specific Styles */
        .form-actions {
            display: flex;
            gap: 12px;
            margin-top: 25px;
        }

        .form-actions .submit-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .form-input, .form-textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }

        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }

        .helper-text {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            display: block;
        }

        /* Hidden class */
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div data-include="../global/header.html"></div>

    <!-- Overlay Containers -->
    <div id="extensionFormOverlay" class="form-overlay">
        <div class="form-container">
            <button class="close-form-btn" onclick="closeForm('extensionFormOverlay')">×</button>
            <div id="extensionFormContent"></div>
        </div>
    </div>

    <div id="updateFormOverlay" class="form-overlay">
        <div class="form-container">
            <button class="close-form-btn" onclick="closeForm('updateFormOverlay')">×</button>
            <div id="updateFormContent"></div>
        </div>
    </div>

    <div class="background">
        <div class="page">

            <!-- ================= ACTIVE ================= -->
            <div class="active">
                <h1 class="page-title">Task Created</h1>

                <div class="projects-toolbar">
                    <input type="text" id="searchActive" placeholder="Search Task...">
                    <select id="filterActive">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="stakeHigh">Highest Stake</option>
                        <option value="stakeLow">Lowest Stake</option>
                        <option value="deadlineSoon">Closest Deadline</option>
                        <option value="deadlineLate">Farthest Deadline</option>
                        <option value="reputationHigh">Author Reputation ↑</option>
                        <option value="reputationLow">Author Reputation ↓</option>
                    </select>
                </div>

                <div id="activeList" class="ActiveTaskContainer"></div>
            </div>

            <!-- ================= MEMBER ================= -->
            <div class="Joined">
                <h1 class="page-title" style="margin-top:40px;">Joined Task</h1>

                <div class="projects-toolbar">
                    <input type="text" id="searchInactive" placeholder="Search Task...">
                    <select id="filterInactive">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="stakeHigh">Highest Stake</option>
                        <option value="stakeLow">Lowest Stake</option>
                        <option value="deadlineSoon">Closest Deadline</option>
                        <option value="deadlineLate">Farthest Deadline</option>
                        <option value="reputationHigh">Author Reputation ↑</option>
                        <option value="reputationLow">Author Reputation ↓</option>
                    </select>
                </div>

                <div id="inactiveList" class="JoinedTaskContainer"></div>
            </div>

            <!-- ================= CREATE ================= -->
            <div class="create-task section">
                <h1 class="page-title">Create Task</h1>

                <form class="task-form">
                    <input type="text" name="title" placeholder="Task Title" required>
                    <input type="text" name="github" placeholder="GitHub pull request URL" required>
                    <input type="number" name="deadlineHours" placeholder="Deadline (in hours)" required>
                    <input type="number" name="maxRevision" placeholder="Maximum Revision" required>
                    
                    <div class="stake-row">
                        <input type="number" name="stake" placeholder="Stake Value" required>
                        <select id="stakeUnit">
                            <option value="wei">Wei</option>
                            <option value="eth">Ether</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-submit">Create Task</button>
                </form>
            </div>

        </div>
    </div>

    <div data-include="../global/footer.html"></div>

    <script>
        // Include external HTML
        document.querySelectorAll("[data-include]").forEach(async el => {
            const file = el.getAttribute("data-include");
            const res = await fetch(file);
            el.innerHTML = await res.text();
        });

        // Templates
        const taskCardTemplate = `
            <div class="task-card">
                <div class="card-header">
                    <div class="indicator green"></div>
                    <h2><span class="title"></span></h2>
                    <span class="task-status badge"></span>
                    <span class="task-value badge"></span>
                </div>

                <div class="task-info">
                    <p><span>Task ID:</span> <span class="taskId">-</span></p>
                    <p><span>Status:</span> <span class="status">-</span></p>
                    <p><span>Value Category:</span> <span class="value">-</span></p>
                    <p><span>Creator:</span> <span class="creator">-</span></p>
                    <p><span>Assigned Member:</span> <span class="member">-</span></p>
                    <p><span>Reward:</span> <span class="reward">-</span> <span>ETH</span></p>
                    <p><span>Deadline Hours:</span> <span class="deadlineHours">-</span> <span>hours</span></p>
                    <p><span>Deadline At:</span> <span class="deadlineAt">-</span></p>
                    <p><span>Created At:</span> <span class="createdAt">-</span></p>
                    <p><span>Creator Stake:</span> <span class="creatorStake">-</span> <span>ETH</span></p>
                    <p><span>Member Stake:</span> <span class="memberStake">-</span> <span>ETH</span></p>
                    <p><span>Max Revisions:</span> <span class="maxRevision">-</span></p>
                    <p><span>GitHub URL:</span> <a href="#" target="_blank" class="githubURL">-</a></p>
                </div>

                <div class="stake-status">
                    <p><span>Member Stake Locked:</span> <span class="isMemberStakeLocked">-</span></p>
                    <p><span>Creator Stake Locked:</span> <span class="isCreatorStakeLocked">-</span></p>
                    <p><span>Reward Claimed:</span> <span class="isRewardClaimed">-</span></p>
                    <p><span>Task Exists:</span> <span class="exists">-</span></p>
                </div>

                <div class="task-actions">
                    <button class="ActivateTask">Activate</button>
                    <button class="OpenRegisteration">Open Registration</button>
                    <button class="CloseRegisteration">Close Registration</button>
                    <button class="CancelTask">Cancel</button>
                    <button class="RequestRevision" data-action="extension">Request Revision</button>
                    <button class="ApproveTask">Approve</button>
                </div>
            </div>`;

        const taskCardTemplateMember = `
            <div class="task-card">
                <div class="card-header">
                    <div class="indicator green"></div>
                    <h2><span class="title"></span></h2>
                </div>

                <div class="task-info">
                    <p><span>Id:</span> <span class="taskId">-</span></p>
                    <p><span>Status:</span> <span class="status">-</span></p>
                    <p><span>reward:</span> <span class="reward">-</span> <span>ETH</span></p>
                    <p><span>creator:</span> <span class="CreatorAddress">-</span></p>
                    <p><span>deadline:</span> <span class="deadlineTime">-</span></p>
                    <p><span>maxRevision:</span> <span class="revison">-</span></p>
                    <p><span>githubURl:</span> <span class="TaskGithubURl">-</span></p>
                </div>
                <div class="stake-status">
                    <p><span>Member Stake Locked:</span> <span class="isMemberStakeLocked">-</span></p>
                    <p><span>Creator Stake Locked:</span> <span class="isCreatorStakeLocked">-</span></p>
                    <p><span>Reward Claimed:</span> <span class="isRewardClaimed">-</span></p>
                </div>

                <div class="task-actions">
                    <button class="SubmitTask">Submit Task</button>
                    <button class="ReSubmitTask" data-action="update">Resubmit</button>
                    <button class="CancelTask">Cancel</button>
                </div>
            </div>`;

        const extensionFormTemplate = `
            <form class="task-extension-form">
                <h3>Request Task Deadline Extension</h3>
                
                <div class="form-group">
                    <label for="extensionTaskId">Task ID</label>
                    <input type="text" id="extensionTaskId" class="form-input" readonly>
                </div>
                
                <div class="form-group">
                    <label for="additionalDeadlineHours">Additional Hours *</label>
                    <div class="input-with-helper">
                        <div class="input-with-unit">
                            <input 
                                type="number" 
                                id="additionalDeadlineHours" 
                                name="additionalDeadlineHours" 
                                min="1" 
                                max="720"
                                step="1"
                                required
                                placeholder="Enter hours"
                                class="form-input"
                            >
                            <span class="input-unit">hours</span>
                        </div>
                        <span class="helper-text">Additional time needed to complete the task (1-720 hours)</span>
                    </div>
                    <div class="time-preview">
                        <p>Extension will add: <span id="hoursPreview">0</span> hours</p>
                        <p>Approximate new deadline: <span id="deadlinePreview">-</span></p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="note">Revision Note *</label>
                    <div class="input-with-helper">
                        <textarea 
                            id="note" 
                            name="note" 
                            rows="4" 
                            required
                            placeholder="Explain why you need more time, what challenges you're facing, etc..."
                            class="form-textarea"
                        ></textarea>
                        <span class="helper-text">Detailed explanation for the revision request</span>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h4>Extension Summary</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Additional Time:</span>
                            <span class="summary-value" id="summaryHours">-</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Extension Reason:</span>
                            <span class="summary-value summary-truncate" id="summaryReason">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn">
                        <span class="btn-text">Submit Extension Request</span>
                        <span class="btn-loading hidden">Processing...</span>
                    </button>
                </div>
                
                <div class="status-message hidden" id="formStatus">
                    <!-- Success or error messages will appear here -->
                </div>
            </form>`;

        const updateFormTemplate = `
            <form class="task-update-form">
                <h3>Update Task Information</h3>
                
                <div class="form-group">
                    <label for="updateTaskId">Task ID</label>
                    <input type="text" id="updateTaskId" class="form-input" readonly>
                </div>
                
                <div class="form-group">
                    <label for="note">Update Note *</label>
                    <div class="input-with-helper">
                        <textarea 
                            id="note" 
                            name="note" 
                            rows="4" 
                            required
                            placeholder="Describe the update, fixes made, or any relevant information..."
                            class="form-textarea"
                        ></textarea>
                        <span class="helper-text">Description of the changes or progress made</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="githubFixedURL">GitHub Fixed URL *</label>
                    <div class="input-with-helper">
                        <input 
                            type="url" 
                            id="githubFixedURL" 
                            name="githubFixedURL" 
                            required
                            placeholder="https://github.com/username/repo/pull/123"
                            pattern="https?://github\\.com/.+/.+"
                            class="form-input"
                        >
                        <span class="helper-text">Link to PR, commit, or issue with the fix</span>
                    </div>
                    <div class="url-preview" id="githubPreview">
                        <!-- Preview will be shown here -->
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn">
                        <span class="btn-text">Submit Update</span>
                        <span class="btn-loading hidden">Processing...</span>
                    </button>
                </div>
                
                <div class="status-message hidden" id="formStatus">
                    <!-- Success or error messages will appear here -->
                </div>
            </form>`;

        // Overlay Functions
        function openForm(overlayId, taskId = null) {
            const overlay = document.getElementById(overlayId);
            overlay.classList.add('visible');
            document.body.style.overflow = 'hidden';
            
            // Set task ID if provided
            if (taskId) {
                if (overlayId === 'extensionFormOverlay') {
                    const taskIdInput = overlay.querySelector('#extensionTaskId');
                    if (taskIdInput) taskIdInput.value = taskId;
                } else if (overlayId === 'updateFormOverlay') {
                    const taskIdInput = overlay.querySelector('#updateTaskId');
                    if (taskIdInput) taskIdInput.value = taskId;
                }
            }
        }

        function closeForm(overlayId) {
            const overlay = document.getElementById(overlayId);
            overlay.classList.remove('visible');
            document.body.style.overflow = '';
        }

        // Close overlay when clicking outside
        document.addEventListener('click', (e) => {
            const extensionOverlay = document.getElementById('extensionFormOverlay');
            const updateOverlay = document.getElementById('updateFormOverlay');
            
            if (extensionOverlay.classList.contains('visible') && 
                !e.target.closest('.form-container') && 
                !e.target.closest('[data-action="extension"]')) {
                closeForm('extensionFormOverlay');
            }
            
            if (updateOverlay.classList.contains('visible') && 
                !e.target.closest('.form-container') && 
                !e.target.closest('[data-action="update"]')) {
                closeForm('updateFormOverlay');
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeForm('extensionFormOverlay');
                closeForm('updateFormOverlay');
            }
        });

        // Initialize forms
        document.addEventListener('DOMContentLoaded', () => {
            // Insert templates
            const extensionFormContent = document.getElementById('extensionFormContent');
            const updateFormContent = document.getElementById('updateFormContent');
            
            if (extensionFormContent) {
                extensionFormContent.innerHTML = extensionFormTemplate;
            }
            
            if (updateFormContent) {
                updateFormContent.innerHTML = updateFormTemplate;
            }

            // Example: Button event handlers (you'll need to adapt this to your actual button setup)
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('RequestRevision') || 
                    e.target.closest('.RequestRevision')) {
                    const taskId = e.target.closest('.task-card').querySelector('.taskId').textContent;
                    openForm('extensionFormOverlay', taskId);
                }
                
                if (e.target.classList.contains('ReSubmitTask') || 
                    e.target.closest('.ReSubmitTask')) {
                    const taskId = e.target.closest('.task-card').querySelector('.taskId').textContent;
                    openForm('updateFormOverlay', taskId);
                }
            });
        });
    </script>
</body>
</html>