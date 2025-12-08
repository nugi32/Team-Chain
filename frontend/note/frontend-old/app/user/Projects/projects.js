// ===== SAMPLE DATA =====
const tasks = [
  {
    title: "Fix Smart Contract UUPS",
    stake: 300,
    deadline: "2025-02-01",
    author: "Nugi",
    reputation: 4.8,
    status: "progress"
  },
  {
    title: "Dashboard UI revamp",
    stake: 150,
    deadline: "2025-01-12",
    author: "Ray",
    reputation: 4.2,
    status: "pending"
  },
  {
    title: "Team Token Airdrop",
    stake: 500,
    deadline: "2025-01-30",
    author: "Max",
    reputation: 4.9,
    status: "done"
  }
];

const grid = document.getElementById("projectsGrid");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

// ======== Render Cards ========
function renderTasks(list){
  grid.innerHTML = "";
  list.forEach(t => {
    const card = document.createElement("div");
    card.className = "task-card";

    card.innerHTML = `
      <h3>${t.title}</h3>
      <ul class="task-meta">
        <li>Stake: <b>${t.stake} USDT</b></li>
        <li>Deadline: ${t.deadline}</li>
        <li>Author: ${t.author} (${t.reputation})</li>
        <li>Status: 
          <span class="status-dot ${t.status}"></span>
          ${t.status}
        </li>
      </ul>
    `;

    card.onclick = () => alert("Open Task → " + t.title);
    grid.appendChild(card);
  });
}

// >>> render awal
renderTasks(tasks);

// ===== SEARCH =====
searchInput.addEventListener("input", e => {
  const v = e.target.value.toLowerCase();
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(v));
  renderTasks(filtered);
});

// ===== FILTER =====
filterSelect.addEventListener("change", () => {
  let list = [...tasks];
  const f = filterSelect.value;

  switch(f){
    case "newest":
      list.sort((a,b)=> new Date(b.deadline) - new Date(a.deadline));
      break;
    case "oldest":
      list.sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));
      break;

    case "stakeHigh":
      list.sort((a,b)=> b.stake - a.stake);
      break;
    case "stakeLow":
      list.sort((a,b)=> a.stake - b.stake);
      break;

    case "deadlineSoon":
      list.sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));
      break;
    case "deadlineLate":
      list.sort((a,b)=> new Date(b.deadline) - new Date(a.deadline));
      break;

    case "reputationHigh":
      list.sort((a,b)=> b.reputation - a.reputation);
      break;
    case "reputationLow":
      list.sort((a,b)=> a.reputation - b.reputation);
      break;
  }

  renderTasks(list);
});
